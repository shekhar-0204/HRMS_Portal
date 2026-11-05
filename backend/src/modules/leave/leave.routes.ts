import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { authenticate } from "../../middleware/authenticate";
import { badRequest, conflict, forbidden, notFound } from "../../lib/http-error";
import { writeAudit } from "../../lib/audit";
import { employeeScope, canReviewFor } from "../../lib/access";
import { addDays, fmtDateTime, todayIST } from "../../lib/time";
import { fromDateOnly, toDateOnly } from "../../lib/dates";
import { notifyEmployees, notifyHrAdmins } from "../../lib/notify";
import { listWorkingDays } from "../../lib/calendar";

export const leaveRouter = Router();
leaveRouter.use(authenticate);

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const empCode = z.string().regex(/^GRP-\d{3,}$/);
const UNPAID = "UNPAID";
const BACKDATE_LIMIT_DAYS = 30;
const TYPE_ORDER = ["CL", "SL", "PL", "COMP"];

type Db = Prisma.TransactionClient;

/** Lazily provision this year's balance rows from each leave type's default quota (Unpaid has no balance). */
async function ensureBalances(db: Db, employeeId: string, year: number) {
  const types = await db.leaveType.findMany({ where: { code: { not: UNPAID } } });
  await db.leaveBalance.createMany({
    data: types.map((t) => ({ employeeId, leaveTypeId: t.id, year, totalQuota: t.defaultAnnualQuota })),
    skipDuplicates: true,
  });
}

// ---- DTOs ----------------------------------------------------------------

const reqInclude = {
  employee: { select: { id: true, employeeCode: true, fullName: true, departmentId: true, reportingManagerId: true } },
  leaveType: true,
  history: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.LeaveRequestInclude;
type Req = Prisma.LeaveRequestGetPayload<{ include: typeof reqInclude }>;

async function toRequestDtos(rows: Req[]) {
  const ids = [...new Set(rows.map((r) => r.approverId ?? r.employee.reportingManagerId).filter((x): x is string => !!x))];
  const people = await prisma.employee.findMany({ where: { id: { in: ids } }, select: { id: true, employeeCode: true, fullName: true } });
  const by = new Map(people.map((p) => [p.id, p]));
  return rows.map((r) => {
    const a = by.get(r.approverId ?? r.employee.reportingManagerId ?? "");
    return {
      id: r.id,
      employeeId: r.employee.employeeCode,
      employeeName: r.employee.fullName,
      leaveTypeCode: r.leaveType.code,
      leaveTypeName: r.leaveType.name,
      startDate: toDateOnly(r.startDate)!,
      endDate: toDateOnly(r.endDate)!,
      durationDays: Number(r.durationDays),
      isHalfDay: r.isHalfDay,
      reason: r.reason,
      status: r.status,
      appliedOn: fmtDateTime(r.createdAt)!,
      approverId: a?.employeeCode,
      approverName: a?.fullName,
      decisionNotes: r.decisionNotes ?? undefined,
      decisionDate: fmtDateTime(r.decisionDate),
      history: r.history.map((h) => ({ actor: h.actorName, action: h.action, timestamp: fmtDateTime(h.createdAt)!, comment: h.comment ?? undefined })),
    };
  });
}

const currentYear = () => Number(todayIST().slice(0, 4));

function ownEmployeeId(req: Express.Request): string {
  const id = req.user!.employeeId;
  if (!id) throw badRequest("Your account is not linked to an employee record");
  return id;
}

// ---- Balances ------------------------------------------------------------

leaveRouter.get("/balances", async (req, res) => {
  const q = z.object({ employeeId: empCode.optional(), year: z.coerce.number().int().optional() }).parse(req.query);
  const year = q.year ?? currentYear();
  if (Math.abs(year - currentYear()) > 1) throw badRequest("Year must be the previous, current or next year");
  const emp = q.employeeId
    ? await prisma.employee.findFirst({ where: { AND: [{ employeeCode: q.employeeId }, employeeScope(req.user!)] } })
    : await prisma.employee.findUnique({ where: { id: ownEmployeeId(req) } });
  if (!emp) throw notFound("Employee not found");

  await ensureBalances(prisma, emp.id, year);
  const rows = await prisma.leaveBalance.findMany({ where: { employeeId: emp.id, year }, include: { leaveType: true } });
  rows.sort((a, b) => TYPE_ORDER.indexOf(a.leaveType.code) - TYPE_ORDER.indexOf(b.leaveType.code));
  res.json({ data: rows.map((b) => {
    const total = Number(b.totalQuota), used = Number(b.consumed), pend = Number(b.pending);
    return { employeeId: emp.employeeCode, leaveTypeCode: b.leaveType.code, leaveTypeName: b.leaveType.name, year,
      totalQuota: total, consumed: used, pendingApproval: pend, available: total - used - pend };
  }) });
});

// ---- Requests ------------------------------------------------------------

leaveRouter.get("/requests", async (req, res) => {
  const q = z.object({ employeeId: empCode.optional(), status: z.enum(["Pending", "Approved", "Rejected", "Cancelled"]).optional() }).parse(req.query);
  const rows = await prisma.leaveRequest.findMany({
    where: {
      ...(q.status ? { status: q.status } : {}),
      employee: { is: { AND: [employeeScope(req.user!), q.employeeId ? { employeeCode: q.employeeId } : {}] } },
    },
    include: reqInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: await toRequestDtos(rows) });
});

const applySchema = z.object({
  leaveTypeCode: z.string().trim().toUpperCase().min(1).max(10),
  startDate: dateOnly,
  endDate: dateOnly,
  isHalfDay: z.boolean().default(false),
  reason: z.string().trim().min(5, "Please give a reason (min 5 characters)").max(500),
});

/** Employee is always the signed-in user. Duration is computed server-side. */
leaveRouter.post("/requests", async (req, res) => {
  const employeeId = ownEmployeeId(req);
  const b = applySchema.parse(req.body);
  const emp = await prisma.employee.findUniqueOrThrow({ where: { id: employeeId } });
  const lt = await prisma.leaveType.findUnique({ where: { code: b.leaveTypeCode } });
  if (!lt) throw badRequest("Unknown leave type");

  if (b.endDate < b.startDate) throw badRequest("End date cannot be before start date");
  if (b.startDate.slice(0, 4) !== b.endDate.slice(0, 4)) throw badRequest("A request cannot span two calendar years - please split it");
  if (b.isHalfDay && b.startDate !== b.endDate) throw badRequest("A half-day request must be a single date");
  if (b.startDate < addDays(todayIST(), -BACKDATE_LIMIT_DAYS)) throw badRequest(`Leave cannot be backdated more than ${BACKDATE_LIMIT_DAYS} days`);

  const workingDays = (await listWorkingDays(b.startDate, b.endDate)).length;
  if (workingDays === 0) throw badRequest("The selected dates contain no working days (weekends/holidays only)");
  const duration = b.isHalfDay ? 0.5 : workingDays;

  const start = fromDateOnly(b.startDate)!, end = fromDateOnly(b.endDate)!;
  const overlap = await prisma.leaveRequest.findFirst({ where: { employeeId, status: { in: ["Pending", "Approved"] }, startDate: { lte: end }, endDate: { gte: start } } });
  if (overlap) throw conflict("You already have a pending or approved leave overlapping these dates");

  const year = Number(b.startDate.slice(0, 4));
  const created = await prisma.$transaction(async (tx) => {
    if (lt.code !== UNPAID) {
      await ensureBalances(tx, employeeId, year);
      // Atomic check-and-reserve: two concurrent applications cannot overspend the balance.
      const n = await tx.$executeRaw`
        UPDATE "LeaveBalance" SET "pending" = "pending" + ${duration}::numeric
        WHERE "employeeId" = ${employeeId} AND "leaveTypeId" = ${lt.id} AND "year" = ${year}
          AND ("totalQuota" - "consumed" - "pending") >= ${duration}::numeric`;
      if (n === 0) throw badRequest(`Insufficient ${lt.name} balance for ${duration} day(s)`);
    }
    return tx.leaveRequest.create({
      data: {
        employeeId, leaveTypeId: lt.id, startDate: start, endDate: end, durationDays: duration, isHalfDay: b.isHalfDay,
        reason: b.reason, approverId: emp.reportingManagerId,
        history: { create: { actorName: emp.fullName, action: "Submitted leave application", comment: `Request for ${duration} day(s) ${lt.code}` } },
      },
      include: reqInclude,
    });
  });

  const msg = { title: "New leave request", message: `${emp.fullName} applied for ${duration} day(s) of ${lt.name} (${b.startDate} to ${b.endDate}).`, category: "Leave" as const, link: "/leave" };
  if (emp.reportingManagerId) await notifyEmployees([emp.reportingManagerId], msg);
  else await notifyHrAdmins(msg);
  await writeAudit({ req, action: "Leave applied", module: "Leave", recordId: created.id, description: `${emp.employeeCode} applied for ${duration} day(s) ${lt.code}` });
  res.status(201).json({ data: (await toRequestDtos([created]))[0] });
});

leaveRouter.post("/requests/:id/cancel", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const employeeId = ownEmployeeId(req);
  const lr = await prisma.leaveRequest.findFirst({ where: { id, employeeId }, include: { leaveType: true, employee: true } });
  if (!lr) throw notFound("Leave request not found");

  await prisma.$transaction(async (tx) => {
    const r = await tx.leaveRequest.updateMany({ where: { id, status: "Pending" }, data: { status: "Cancelled", decisionDate: new Date() } });
    if (r.count === 0) throw conflict("Only pending requests can be cancelled");
    if (lr.leaveType.code !== UNPAID)
      await tx.leaveBalance.updateMany({
        where: { employeeId, leaveTypeId: lr.leaveTypeId, year: lr.startDate.getUTCFullYear() },
        data: { pending: { decrement: lr.durationDays } },
      });
    await tx.leaveRequestHistory.create({ data: { requestId: id, actorName: lr.employee.fullName, action: "Cancelled leave application" } });
  });
  await writeAudit({ req, action: "Leave cancelled", module: "Leave", recordId: id, description: `${lr.employee.employeeCode} cancelled a pending leave request` });
  const fresh = await prisma.leaveRequest.findUniqueOrThrow({ where: { id }, include: reqInclude });
  res.json({ data: (await toRequestDtos([fresh]))[0] });
});

const reviewSchema = z.object({ decision: z.enum(["Approved", "Rejected"]), notes: z.string().trim().max(500).optional() });

leaveRouter.patch("/requests/:id/review", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { decision, notes } = reviewSchema.parse(req.body);
  const user = req.user!;

  const lr = await prisma.leaveRequest.findUnique({ where: { id }, include: reqInclude });
  if (!lr || !(await prisma.employee.findFirst({ where: { AND: [{ id: lr.employeeId }, employeeScope(user)] } }))) throw notFound("Leave request not found");
  if (user.employeeId === lr.employeeId) throw forbidden("You cannot review your own request");
  if (!canReviewFor(user, lr.employee)) throw forbidden();
  if (decision === "Rejected" && !notes) throw badRequest("Please provide a reason when rejecting");

  const leaveDays = decision === "Approved" ? await listWorkingDays(toDateOnly(lr.startDate)!, toDateOnly(lr.endDate)!) : [];
  await prisma.$transaction(async (tx) => {
    // Status guard makes approve/approve and approve/cancel races safe: only one wins.
    const r = await tx.leaveRequest.updateMany({
      where: { id, status: "Pending" },
      data: { status: decision, approverId: user.employeeId, decisionNotes: notes, decisionDate: new Date() },
    });
    if (r.count === 0) throw conflict("This request has already been processed");
    if (lr.leaveType.code !== UNPAID)
      await tx.leaveBalance.updateMany({
        where: { employeeId: lr.employeeId, leaveTypeId: lr.leaveTypeId, year: lr.startDate.getUTCFullYear() },
        data: decision === "Approved"
          ? { pending: { decrement: lr.durationDays }, consumed: { increment: lr.durationDays } }
          : { pending: { decrement: lr.durationDays } },
      });
    if (decision === "Approved" && leaveDays.length)
      // Mark the approved days on the attendance register; days that already have a record (real punches) are left alone.
      await tx.attendanceRecord.createMany({
        data: leaveDays.map((d) => ({
          employeeId: lr.employeeId, date: fromDateOnly(d)!, status: "Leave", source: "Manual Entry",
          notes: `Approved ${lr.leaveType.name}${lr.isHalfDay ? " (half day)" : ""}`,
        })),
        skipDuplicates: true,
      });
    await tx.leaveRequestHistory.create({ data: { requestId: id, actorName: user.name, action: `${decision} leave application`, comment: notes } });
  });

  await notifyEmployees([lr.employeeId], {
    title: `Leave ${decision.toLowerCase()}`, message: `Your ${lr.leaveType.name} request (${toDateOnly(lr.startDate)} to ${toDateOnly(lr.endDate)}) was ${decision.toLowerCase()}.`,
    category: "Leave", link: "/leave",
  });
  await writeAudit({ req, action: `Leave ${decision.toLowerCase()}`, module: "Leave", recordId: id, description: `${decision} ${lr.employee.employeeCode}'s ${lr.leaveType.code} request` });
  const fresh = await prisma.leaveRequest.findUniqueOrThrow({ where: { id }, include: reqInclude });
  res.json({ data: (await toRequestDtos([fresh]))[0] });
});
