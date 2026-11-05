import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/authorize";
import { employeeScope } from "../../lib/access";
import { badRequest } from "../../lib/http-error";
import { addDays, startOfMonthIST, todayIST } from "../../lib/time";
import { fromDateOnly, toDateOnly } from "../../lib/dates";
import { sendCsv } from "../../lib/csv";
import { writeAudit } from "../../lib/audit";

export const reportsRouter = Router();
reportsRouter.use(authenticate, requirePermission("reports:read"));

/**
 * Reports are scoped like everything else: HR / Super Admin see the company, managers only their department.
 * Phase 1 exports deliberately contain NO salary, bank, ID-number or personal contact data.
 */
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const format = z.enum(["json", "csv"]).default("json");
const count = <T extends string>(items: T[]) => Object.entries(items.reduce<Record<string, number>>((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {}));

reportsRouter.get("/headcount", async (req, res) => {
  const { format: fmt } = z.object({ format }).parse(req.query);
  const rows = await prisma.employee.findMany({
    where: employeeScope(req.user!),
    include: { department: true, designation: true },
    orderBy: { employeeCode: "asc" },
  });
  if (fmt === "csv") {
    await writeAudit({ req, action: "Report exported", module: "Employees", description: "Exported headcount roster (CSV)" });
    return sendCsv(res, "headcount.csv", rows.map((e) => ({
      "Employee ID": e.employeeCode, Name: e.fullName, Department: e.department.name, Designation: e.designation.title,
      "Employment Type": e.employmentType, Status: e.status, "Joining Date": toDateOnly(e.joiningDate), "Work Location": e.workLocation,
    })));
  }
  const byDept = new Map<string, { departmentId: string; name: string; count: number }>();
  for (const e of rows) {
    const cur = byDept.get(e.departmentId) ?? { departmentId: e.departmentId, name: e.department.name, count: 0 };
    cur.count++; byDept.set(e.departmentId, cur);
  }
  res.json({
    data: {
      total: rows.length,
      byDepartment: [...byDept.values()].sort((a, b) => b.count - a.count),
      byStatus: count(rows.map((e) => e.status)).map(([status, n]) => ({ status, count: n })),
      byEmploymentType: count(rows.map((e) => e.employmentType)).map(([employmentType, n]) => ({ employmentType, count: n })),
    },
  });
});

reportsRouter.get("/attendance", async (req, res) => {
  const q = z.object({ start: dateOnly.optional(), end: dateOnly.optional(), departmentId: z.string().uuid().optional(), format }).parse(req.query);
  const end = q.end ?? todayIST(), start = q.start ?? startOfMonthIST();
  if (start > end) throw badRequest("start must not be after end");
  if (addDays(start, 366) < end) throw badRequest("Date range cannot exceed one year");

  const recs = await prisma.attendanceRecord.findMany({
    where: {
      date: { gte: fromDateOnly(start)!, lte: fromDateOnly(end)! },
      employee: { is: { AND: [employeeScope(req.user!), q.departmentId ? { departmentId: q.departmentId } : {}] } },
    },
    include: { employee: { include: { department: true } } },
  });
  const per = new Map<string, { employeeId: string; name: string; department: string; present: number; late: number; halfDay: number; leave: number; totalHours: number }>();
  for (const r of recs) {
    const cur = per.get(r.employeeId) ?? { employeeId: r.employee.employeeCode, name: r.employee.fullName, department: r.employee.department.name, present: 0, late: 0, halfDay: 0, leave: 0, totalHours: 0 };
    if (r.status === "Present") cur.present++;
    else if (r.status === "Late") cur.late++;
    else if (r.status === "Half-Day") cur.halfDay++;
    else if (r.status === "Leave") cur.leave++;
    cur.totalHours += (r.workDurationMinutes ?? 0) / 60;
    per.set(r.employeeId, cur);
  }
  const rows = [...per.values()].map((p) => ({ ...p, totalHours: Math.round(p.totalHours * 100) / 100 })).sort((a, b) => a.employeeId.localeCompare(b.employeeId));
  if (q.format === "csv") {
    await writeAudit({ req, action: "Report exported", module: "Attendance", description: `Exported attendance summary ${start}..${end} (CSV)` });
    return sendCsv(res, `attendance_${start}_${end}.csv`, rows.map((r) => ({
      "Employee ID": r.employeeId, Name: r.name, Department: r.department, Present: r.present, Late: r.late, "Half-Day": r.halfDay, Leave: r.leave, "Total Hours": r.totalHours,
    })));
  }
  res.json({ data: { start, end, byStatus: count(recs.map((r) => r.status)).map(([status, n]) => ({ status, count: n })), perEmployee: rows } });
});

reportsRouter.get("/leave", async (req, res) => {
  const q = z.object({ year: z.coerce.number().int().min(2000).max(2100).optional(), format }).parse(req.query);
  const year = q.year ?? Number(todayIST().slice(0, 4));
  const reqs = await prisma.leaveRequest.findMany({
    where: {
      startDate: { gte: fromDateOnly(`${year}-01-01`)!, lte: fromDateOnly(`${year}-12-31`)! },
      employee: { is: employeeScope(req.user!) },
    },
    include: { employee: { include: { department: true } }, leaveType: true },
    orderBy: { startDate: "asc" },
  });
  if (q.format === "csv") {
    await writeAudit({ req, action: "Report exported", module: "Leave", description: `Exported leave report ${year} (CSV)` });
    return sendCsv(res, `leave_${year}.csv`, reqs.map((r) => ({
      "Employee ID": r.employee.employeeCode, Name: r.employee.fullName, Department: r.employee.department.name, "Leave Type": r.leaveType.name,
      "Start Date": toDateOnly(r.startDate), "End Date": toDateOnly(r.endDate), Days: Number(r.durationDays), Status: r.status,
    })));
  }
  const byType = new Map<string, { leaveTypeCode: string; leaveTypeName: string; requests: number; approvedDays: number; pendingDays: number }>();
  for (const r of reqs) {
    const cur = byType.get(r.leaveType.code) ?? { leaveTypeCode: r.leaveType.code, leaveTypeName: r.leaveType.name, requests: 0, approvedDays: 0, pendingDays: 0 };
    cur.requests++;
    if (r.status === "Approved") cur.approvedDays += Number(r.durationDays);
    if (r.status === "Pending") cur.pendingDays += Number(r.durationDays);
    byType.set(r.leaveType.code, cur);
  }
  res.json({ data: { year, total: reqs.length, byType: [...byType.values()], byStatus: count(reqs.map((r) => r.status)).map(([status, n]) => ({ status, count: n })) } });
});
