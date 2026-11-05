import { Router } from "express";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/authorize";
import { can } from "../../lib/permissions";
import { employeeScope } from "../../lib/access";
import { badRequest, conflict, forbidden, notFound } from "../../lib/http-error";
import { fromDateOnly } from "../../lib/dates";
import { writeAudit } from "../../lib/audit";
import { generateTempPassword } from "../../lib/password";
import { employeeInclude, toEmployeeDto } from "./employee.dto";
import { createEmployeeSchema, deactivateSchema, listQuerySchema, selfUpdateSchema, updateEmployeeSchema } from "./employee.schemas";

export const employeeRouter = Router();
employeeRouter.use(authenticate);

employeeRouter.get("/", async (req, res) => {
  const q = listQuerySchema.parse(req.query);
  const where: Prisma.EmployeeWhereInput = {
    AND: [
      employeeScope(req.user!),
      q.departmentId ? { departmentId: q.departmentId } : {},
      q.status ? { status: q.status } : {},
      q.search
        ? { OR: [
            { fullName: { contains: q.search, mode: "insensitive" } },
            { workEmail: { contains: q.search, mode: "insensitive" } },
            { employeeCode: { contains: q.search, mode: "insensitive" } },
          ] }
        : {},
    ],
  };
  const rows = await prisma.employee.findMany({ where, include: employeeInclude, orderBy: { employeeCode: "asc" } });
  res.json({ data: rows.map(toEmployeeDto) });
});

employeeRouter.get("/:id", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const row = await prisma.employee.findFirst({ where: { AND: [{ id }, employeeScope(req.user!)] }, include: employeeInclude });
  if (!row) throw notFound("Employee not found"); // 404 (not 403) so IDs outside scope aren't revealed
  res.json({ data: toEmployeeDto(row) });
});

employeeRouter.post("/", requirePermission("employees:write"), async (req, res) => {
  const b = createEmployeeSchema.parse(req.body);
  await assertRefs(b.departmentId, b.designationId, b.reportingManagerId);

  /**
   * Onboarding is a single atomic operation:
   * 1. create the employee profile
   * 2. create the linked employee login account
   * 3. return the temporary credentials ONCE to the HR/Super Admin
   *
   * The password is only stored as a bcrypt hash. The plaintext value exists
   * only in this request and is never returned by any GET endpoint.
   */
  const temporaryPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const created = await prisma.$transaction(async (tx) => {
    let code = b.employeeId;
    if (code) {
      if (await tx.employee.findUnique({ where: { employeeCode: code } })) throw conflict(`Employee ID ${code} already exists`);
    } else {
      const all = await tx.employee.findMany({ select: { employeeCode: true } });
      const max = all.reduce((m, e) => Math.max(m, parseInt(e.employeeCode.split("-")[1] ?? "0", 10)), 0);
      code = `GRP-${String(max + 1).padStart(3, "0")}`;
    }

    // A User email is unique too, so fail with a clear onboarding error before creating the employee.
    if (await tx.user.findUnique({ where: { email: b.workEmail } })) {
      throw conflict("A login account with this work email already exists");
    }

    const employee = await tx.employee.create({
      data: {
        employeeCode: code!, fullName: b.fullName, workEmail: b.workEmail, personalEmail: b.personalEmail,
        phone: b.phone, gender: b.gender, dateOfBirth: fromDateOnly(b.dateOfBirth),
        joiningDate: fromDateOnly(b.joiningDate)!, employmentType: b.employmentType, status: b.status,
        probationEndDate: fromDateOnly(b.probationEndDate), departmentId: b.departmentId,
        designationId: b.designationId, reportingManagerId: b.reportingManagerId, workLocation: b.workLocation,
        emergencyName: b.emergencyContact.name, emergencyRelation: b.emergencyContact.relationship,
        emergencyPhone: b.emergencyContact.phone, address: b.address, avatarUrl: b.avatarUrl,
      },
      include: employeeInclude,
    });

    const user = await tx.user.create({
      data: {
        email: b.workEmail,
        role: "employee",
        employeeId: employee.id,
        passwordHash,
        mustChangePassword: true,
        preferences: { create: {} },
      },
    });

    return { employee, user };
  });

  await writeAudit({ req, action: "Employee created", module: "Employees", recordId: created.employee.id,
    description: `Created employee ${created.employee.employeeCode} (${created.employee.fullName}) with an employee login account` });

  res.status(201).json({
    data: toEmployeeDto(created.employee),
    temporaryCredentials: {
      email: created.user.email,
      password: temporaryPassword,
      role: "employee",
      mustChangePassword: true,
    },
  });
});

employeeRouter.patch("/:id", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const user = req.user!;
  const isAdmin = can(user.role, "employees:write");
  const isSelf = user.employeeId === id;
  if (!isAdmin && !isSelf) throw forbidden();

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) throw notFound("Employee not found");

  const b: any = isAdmin ? updateEmployeeSchema.parse(req.body) : selfUpdateSchema.parse(req.body);
  if (isAdmin && (b.departmentId || b.designationId || b.reportingManagerId))
    await assertRefs(b.departmentId ?? existing.departmentId, b.designationId ?? existing.designationId, b.reportingManagerId);
  if (b.status === "Inactive") throw badRequest("Use the deactivate endpoint to deactivate an employee");
  if (b.reportingManagerId === id) throw badRequest("An employee cannot report to themselves");
  if (isAdmin && b.reportingManagerId) await assertNoReportingCycle(id, b.reportingManagerId);

  // The login e-mail mirrors the work e-mail: refuse early if another account already uses the new address.
  if (isAdmin && b.workEmail && b.workEmail !== existing.workEmail) {
    const clash = await prisma.user.findUnique({ where: { email: b.workEmail } });
    if (clash && clash.employeeId !== id) throw conflict("A login account with this work email already exists");
  }

  const ec = b.emergencyContact;
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.employee.update({
    where: { id },
    data: {
      fullName: b.fullName, workEmail: b.workEmail, personalEmail: b.personalEmail, phone: b.phone,
      gender: b.gender, dateOfBirth: b.dateOfBirth ? fromDateOnly(b.dateOfBirth) : undefined,
      joiningDate: b.joiningDate ? fromDateOnly(b.joiningDate)! : undefined,
      employmentType: b.employmentType, status: b.status,
      probationEndDate: b.probationEndDate ? fromDateOnly(b.probationEndDate) : undefined,
      departmentId: b.departmentId, designationId: b.designationId, reportingManagerId: b.reportingManagerId,
      workLocation: b.workLocation, address: b.address, avatarUrl: b.avatarUrl,
      emergencyName: ec?.name, emergencyRelation: ec?.relationship, emergencyPhone: ec?.phone,
    },
    include: employeeInclude,
    });
    if (isAdmin && b.workEmail && b.workEmail !== existing.workEmail)
      await tx.user.updateMany({ where: { employeeId: id }, data: { email: b.workEmail } });
    return row;
  });
  await writeAudit({ req, action: "Employee updated", module: "Employees", recordId: id,
    description: `Updated ${Object.keys(b).join(", ")} on ${updated.employeeCode}` });
  res.json({ data: toEmployeeDto(updated) });
});

/** BR-006/007: deactivation blocks sign-in but retains all historical records. */
employeeRouter.patch("/:id/deactivate", requirePermission("employees:write"), async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { reason } = deactivateSchema.parse(req.body ?? {});
  if (req.user!.employeeId === id) throw badRequest("You cannot deactivate your own account");

  const emp = await prisma.employee.findUnique({ where: { id }, include: { user: true } });
  if (!emp) throw notFound("Employee not found");

  // Privilege + lock-out guards (same rules as /users/:id/status): only a Super Admin may deactivate a Super Admin,
  // and the last active Super Admin can never be removed.
  if (emp.user?.role === "super_admin") {
    if (!can(req.user!.role, "users:manage")) throw forbidden("Only a Super Admin can deactivate a Super Admin");
    const others = await prisma.user.count({ where: { role: "super_admin", isActive: true, id: { not: emp.user.id } } });
    if (others === 0) throw badRequest("At least one active Super Admin must remain");
  }

  await prisma.$transaction([
    prisma.employee.update({ where: { id }, data: { status: "Inactive", exitStatus: reason ?? emp.exitStatus } }),
    ...(emp.user
      ? [prisma.user.update({ where: { id: emp.user.id }, data: { isActive: false } }),
         prisma.session.deleteMany({ where: { userId: emp.user.id } })]
      : []),
  ]);
  await writeAudit({ req, action: "Employee deactivated", module: "Employees", recordId: id,
    description: `Deactivated ${emp.employeeCode}${reason ? `: ${reason}` : ""}` });
  res.json({ success: true });
});

/** Walks up the manager chain of `managerId`; fails if `employeeId` appears in it (A -> B -> A). */
async function assertNoReportingCycle(employeeId: string, managerId: string) {
  let cursor: string | null = managerId;
  for (let hops = 0; cursor && hops < 50; hops++) {
    if (cursor === employeeId) throw badRequest("This reporting line would create a loop (the manager already reports to this employee)");
    const row: { reportingManagerId: string | null } | null = await prisma.employee.findUnique({ where: { id: cursor }, select: { reportingManagerId: true } });
    cursor = row?.reportingManagerId ?? null;
  }
}

async function assertRefs(departmentId: string, designationId: string, managerId?: string) {
  const [dept, des, mgr] = await Promise.all([
    prisma.department.findUnique({ where: { id: departmentId } }),
    prisma.designation.findUnique({ where: { id: designationId } }),
    managerId ? prisma.employee.findUnique({ where: { id: managerId } }) : Promise.resolve(true),
  ]);
  if (!dept) throw badRequest("Unknown department");
  if (!des) throw badRequest("Unknown designation");
  if (des.departmentId !== departmentId) throw badRequest("Designation does not belong to the selected department");
  if (!mgr) throw badRequest("Unknown reporting manager");
}
