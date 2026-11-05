import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/authorize";
import { can } from "../../lib/permissions";
import { badRequest } from "../../lib/http-error";
import { writeAudit } from "../../lib/audit";
import { dateIST, istToUtc, todayIST } from "../../lib/time";
import { notifyUsers } from "../../lib/notify";

export const announcementsRouter = Router();
announcementsRouter.use(authenticate);

type Row = Prisma.AnnouncementGetPayload<object>;
const toDto = (a: Row) => ({
  id: a.id, title: a.title, content: a.content, category: a.category, priority: a.priority,
  publishedDate: dateIST(a.publishedAt), expiryDate: a.expiresAt ? dateIST(a.expiresAt) : undefined,
  targetAudience: a.targetAudience, authorName: a.authorName,
});

/** Audience targeting is enforced on the server: employees never receive announcements meant for others. */
function visibleTo(user: NonNullable<Express.Request["user"]>): Prisma.AnnouncementWhereInput {
  if (can(user.role, "announcements:write")) return {};
  const or: Prisma.AnnouncementWhereInput[] = [{ targetAudience: "All Employees" }];
  if (user.role === "department_manager") or.push({ targetAudience: "Managers" });
  if (user.departmentId) or.push({ targetAudience: "Department", targetDepartmentId: user.departmentId });
  return { OR: or };
}

announcementsRouter.get("/", async (req, res) => {
  const { includeExpired } = z.object({ includeExpired: z.enum(["true", "false"]).optional() }).parse(req.query);
  const admin = can(req.user!.role, "announcements:write");
  const notExpired: Prisma.AnnouncementWhereInput = { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
  const rows = await prisma.announcement.findMany({
    where: { AND: [visibleTo(req.user!), admin && includeExpired === "true" ? {} : notExpired] },
    orderBy: { publishedAt: "desc" },
  });
  res.json({ data: rows.map(toDto) });
});

const createSchema = z.object({
  title: z.string().trim().min(3).max(150),
  content: z.string().trim().min(3).max(5000),
  category: z.enum(["General", "HR Notice", "Policy Update", "Celebration", "Emergency"]),
  priority: z.enum(["Low", "Medium", "High"]),
  targetAudience: z.enum(["All Employees", "Department", "Managers"]),
  targetDepartmentId: z.string().uuid().optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

announcementsRouter.post("/", requirePermission("announcements:write"), async (req, res) => {
  const b = createSchema.parse(req.body);
  const user = req.user!;
  let deptId: string | null = null;
  if (b.targetAudience === "Department") {
    deptId = b.targetDepartmentId ?? user.departmentId; // default: the author's own department
    if (!deptId) throw badRequest("Choose a department for a department announcement");
    if (!(await prisma.department.findUnique({ where: { id: deptId } }))) throw badRequest("Unknown department");
  }
  if (b.expiryDate && b.expiryDate < todayIST()) throw badRequest("Expiry date cannot be in the past");

  const a = await prisma.announcement.create({
    data: {
      title: b.title, content: b.content, category: b.category, priority: b.priority, targetAudience: b.targetAudience,
      targetDepartmentId: deptId, authorId: user.id, authorName: user.name,
      expiresAt: b.expiryDate ? istToUtc(b.expiryDate, { h: 23, m: 59 }) : null, // valid through the whole expiry day
    },
  });

  const audience = await prisma.user.findMany({
    where: {
      isActive: true, id: { not: user.id },
      ...(b.targetAudience === "Managers" ? { role: { in: ["department_manager", "hr_admin", "super_admin"] } } : {}),
      ...(b.targetAudience === "Department" ? { employee: { is: { departmentId: deptId! } } } : {}),
    },
    select: { id: true },
  });
  await notifyUsers(audience.map((u) => u.id), { title: `New announcement: ${a.title}`, message: a.content.slice(0, 140), category: "Announcement", link: "/announcements" });

  await writeAudit({ req, action: "Announcement published", module: "Organization", recordId: a.id, description: `Published "${a.title}" to ${b.targetAudience}` });
  res.status(201).json({ data: toDto(a) });
});
