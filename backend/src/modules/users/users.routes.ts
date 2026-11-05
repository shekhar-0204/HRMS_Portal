import { Router } from "express";
import bcrypt from "bcrypt";
import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/authorize";
import { badRequest, conflict, notFound } from "../../lib/http-error";
import { writeAudit } from "../../lib/audit";
import { fmtDateTime } from "../../lib/time";
import { generateTempPassword, passwordSchema } from "../../lib/password";
import { ROLE_MATRIX, can } from "../../lib/permissions";
import { forbidden } from "../../lib/http-error";

export const usersRouter = Router();
export const rolesRouter = Router();
usersRouter.use(authenticate);
rolesRouter.use(authenticate);

const roleEnum = z.nativeEnum(UserRole);
const userInclude = { employee: { select: { employeeCode: true, fullName: true, status: true } } } satisfies Prisma.UserInclude;
type UserRow = Prisma.UserGetPayload<{ include: typeof userInclude }>;

/** Shape matches the frontend Users page rows. */
const toUserDto = (u: UserRow) => ({
  id: u.id,
  name: u.employee?.fullName ?? u.email,
  email: u.email,
  employeeId: u.employee?.employeeCode,
  role: u.role,
  status: u.isActive ? "Active" : "Inactive",
  lastLogin: fmtDateTime(u.lastLoginAt) ?? "Never",
  mustChangePassword: u.mustChangePassword,
});

/** Never lock the company out: at least one other active super admin must remain. */
async function assertAnotherSuperAdmin(excludeUserId: string) {
  const n = await prisma.user.count({ where: { role: "super_admin", isActive: true, id: { not: excludeUserId } } });
  if (n === 0) throw badRequest("At least one active Super Admin must remain");
}

// ---- Roles matrix (read-only, same source the server enforces) --------------
rolesRouter.get("/matrix", (_req, res) => {
  res.json({
    data: ROLE_MATRIX.map((r) => ({
      module: r.module,
      super_admin: r.roles.includes("super_admin"),
      hr_admin: r.roles.includes("hr_admin"),
      manager: r.roles.includes("department_manager"),
      employee: r.roles.includes("employee"),
    })),
  });
});

// ---- Users ---------------------------------------------------------------------
// Super Admin: everything. HR: may only create a login (role "employee") for a new hire - see POST / below.

const createSchema = z.object({
  employeeId: z.string().regex(/^GRP-\d{3,}$/, "Use the employee code, e.g. GRP-014"),
  role: roleEnum,
  email: z.string().trim().toLowerCase().email().optional(), // defaults to the employee's work email
  temporaryPassword: passwordSchema.optional(),
});

/** Gives an existing employee a login. The temporary password is returned ONCE and must be changed at first login. */
usersRouter.post("/", requirePermission("users:provision"), async (req, res) => {
  const b = createSchema.parse(req.body);
  // Privilege-escalation guard: HR may onboard regular employees only; elevated roles need a Super Admin.
  if (b.role !== "employee" && !can(req.user!.role, "users:manage")) throw forbidden("Only a Super Admin can create accounts with this role");
  const emp = await prisma.employee.findUnique({ where: { employeeCode: b.employeeId }, include: { user: true } });
  if (!emp) throw notFound("Employee not found");
  if (emp.user) throw conflict("This employee already has a login account");
  if (emp.status === "Inactive") throw badRequest("Cannot create an account for an inactive employee");

  const email = b.email ?? emp.workEmail;
  if (await prisma.user.findUnique({ where: { email } })) throw conflict("A user with this email already exists");

  const tempPassword = b.temporaryPassword ?? generateTempPassword();
  const user = await prisma.user.create({
    data: {
      email, role: b.role, employeeId: emp.id, mustChangePassword: true,
      passwordHash: await bcrypt.hash(tempPassword, 12),
      preferences: { create: {} },
    },
    include: userInclude,
  });
  await writeAudit({ req, action: "User account created", module: "Users", recordId: user.id, description: `Created ${b.role} account for ${emp.employeeCode} (${email})` });
  res.status(201).json({ data: toUserDto(user), temporaryPassword: tempPassword });
});

usersRouter.use(requirePermission("users:manage"));

usersRouter.get("/", async (_req, res) => {
  const rows = await prisma.user.findMany({ include: userInclude, orderBy: { createdAt: "asc" } });
  res.json({ data: rows.map(toUserDto) });
});

usersRouter.patch("/:id/role", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { role } = z.object({ role: roleEnum }).parse(req.body);
  if (id === req.user!.id) throw badRequest("You cannot change your own role");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw notFound("User not found");
  if (target.role === "super_admin" && role !== "super_admin") await assertAnotherSuperAdmin(id);

  const updated = await prisma.user.update({ where: { id }, data: { role }, include: userInclude });
  await writeAudit({ req, action: "Role changed", module: "Users", recordId: id, description: `Changed role of ${target.email} from ${target.role} to ${role}` });
  res.json({ data: toUserDto(updated) });
});

usersRouter.patch("/:id/status", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
  if (id === req.user!.id) throw badRequest("You cannot change your own account status");
  const target = await prisma.user.findUnique({ where: { id }, include: userInclude });
  if (!target) throw notFound("User not found");
  if (!isActive && target.role === "super_admin") await assertAnotherSuperAdmin(id);
  if (isActive && target.employee?.status === "Inactive") throw badRequest("The linked employee is inactive. Reactivate the employee first.");

  const [updated] = await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { isActive }, include: userInclude }),
    ...(isActive ? [] : [prisma.session.deleteMany({ where: { userId: id } })]), // sign the user out everywhere
  ]);
  await writeAudit({ req, action: isActive ? "Account activated" : "Account deactivated", module: "Users", recordId: id, description: `${isActive ? "Activated" : "Deactivated"} account ${target.email}` });
  res.json({ data: toUserDto(updated) });
});

usersRouter.post("/:id/reset-password", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  if (id === req.user!.id) throw badRequest("Use Change Password for your own account");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw notFound("User not found");

  const tempPassword = generateTempPassword();
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(tempPassword, 12), mustChangePassword: true } }),
    prisma.session.deleteMany({ where: { userId: id } }),
  ]);
  await writeAudit({ req, action: "Password reset", module: "Users", recordId: id, description: `Reset password for ${target.email}` });
  res.json({ success: true, temporaryPassword: tempPassword });
});
