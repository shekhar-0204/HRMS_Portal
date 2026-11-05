import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/authorize";
import { badRequest } from "../../lib/http-error";
import { writeAudit } from "../../lib/audit";

export const organizationRouter = Router();
organizationRouter.use(authenticate);

const deptSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{2,8}$/, "Code must be 2-8 letters"),
  description: z.string().trim().max(500).default(""),
  headEmployeeId: z.string().regex(/^GRP-\d{3,}$/).optional(), // employee code, as used by the frontend
});

const desSchema = z.object({
  title: z.string().trim().min(2).max(120),
  departmentId: z.string().uuid(),
  level: z.string().trim().min(1).max(60),
  description: z.string().trim().max(500).optional(),
});

organizationRouter.get("/departments", async (_req, res) => {
  const depts = await prisma.department.findMany({ include: { _count: { select: { employees: { where: { status: { not: "Inactive" } } } } } }, orderBy: { name: "asc" } });
  const headIds = depts.map((d) => d.headEmployeeId).filter((x): x is string => !!x);
  const heads = await prisma.employee.findMany({ where: { id: { in: headIds } }, select: { id: true, employeeCode: true, fullName: true } });
  const byId = new Map(heads.map((h) => [h.id, h]));
  res.json({ data: depts.map((d) => ({
    id: d.id, name: d.name, code: d.code, description: d.description,
    headEmployeeId: d.headEmployeeId ? byId.get(d.headEmployeeId)?.employeeCode : undefined,
    headName: d.headEmployeeId ? byId.get(d.headEmployeeId)?.fullName : undefined,
    employeeCount: d._count.employees,
  })) });
});

organizationRouter.post("/departments", requirePermission("organization:write"), async (req, res) => {
  const b = deptSchema.parse(req.body);
  let headId: string | undefined;
  if (b.headEmployeeId) {
    const head = await prisma.employee.findUnique({ where: { employeeCode: b.headEmployeeId } });
    if (!head) throw badRequest("Unknown department head");
    headId = head.id;
  }
  const d = await prisma.department.create({ data: { name: b.name, code: b.code, description: b.description, headEmployeeId: headId } });
  await writeAudit({ req, action: "Department created", module: "Organization", recordId: d.id, description: `Created department ${d.name} (${d.code})` });
  res.status(201).json({ data: { id: d.id, name: d.name, code: d.code, description: d.description, headEmployeeId: b.headEmployeeId, employeeCount: 0 } });
});

organizationRouter.get("/designations", async (_req, res) => {
  const rows = await prisma.designation.findMany({ include: { department: true }, orderBy: [{ department: { name: "asc" } }, { title: "asc" }] });
  res.json({ data: rows.map((d) => ({ id: d.id, title: d.title, departmentId: d.departmentId, departmentName: d.department.name, level: d.level, description: d.description ?? undefined })) });
});

organizationRouter.post("/designations", requirePermission("organization:write"), async (req, res) => {
  const b = desSchema.parse(req.body);
  const dept = await prisma.department.findUnique({ where: { id: b.departmentId } });
  if (!dept) throw badRequest("Unknown department");
  const d = await prisma.designation.create({ data: b });
  await writeAudit({ req, action: "Designation created", module: "Organization", recordId: d.id, description: `Created designation ${d.title} in ${dept.name}` });
  res.status(201).json({ data: { id: d.id, title: d.title, departmentId: d.departmentId, departmentName: dept.name, level: d.level, description: d.description ?? undefined } });
});
