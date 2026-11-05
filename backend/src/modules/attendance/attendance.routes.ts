import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { authenticate } from "../../middleware/authenticate";
import { badRequest, conflict, forbidden, notFound } from "../../lib/http-error";
import { writeAudit } from "../../lib/audit";
import { employeeScope, canReviewFor } from "../../lib/access";
import { addDays, fmtDateTime, fmtTime, istToUtc, minutesOfDayIST, parseClock, todayIST } from "../../lib/time";
import { toDateOnly, fromDateOnly } from "../../lib/dates";
import { CORRECTION_WINDOW_DAYS, HALF_DAY_BELOW_MINUTES, LATE_AFTER_MINUTES } from "../../lib/attendance-rules";
import { notifyEmployees, notifyHrAdmins } from "../../lib/notify";

export const attendanceRouter = Router();
attendanceRouter.use(authenticate);

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const clock = z.string().refine((s) => parseClock(s) !== null, "Use a time like 09:30 AM or 18:35");
const empCode = z.string().regex(/^GRP-\d{3,}$/);

const recInclude = { employee: { select: { employeeCode: true, fullName: true } } } satisfies Prisma.AttendanceRecordInclude;
type Rec = Prisma.AttendanceRecordGetPayload<{ include: typeof recInclude }>;

const toRecordDto = (r: Rec, correctionPending = false) => ({
  id: r.id,
  employeeId: r.employee.employeeCode,
  employeeName: r.employee.fullName,
  date: toDateOnly(r.date)!,
  checkIn: fmtTime(r.checkIn),
  checkOut: fmtTime(r.checkOut),
  workDurationHours: r.workDurationMinutes != null ? Math.round((r.workDurationMinutes / 60) * 100) / 100 : undefined,
  status: r.status,
  source: r.source,
  notes: r.notes ?? undefined,
  isCorrectionRequested: correctionPending,
});

function requireOwnEmployee(req: Express.Request): string {
  const id = req.user!.employeeId;
  if (!id) throw badRequest("Your account is not linked to an employee record");
  return id;
}

/** Status for a completed day. */
function statusFor(minutes: number, wasLate: boolean): string {
  if (minutes < HALF_DAY_BELOW_MINUTES) return "Half-Day";
  return wasLate ? "Late" : "Present";
}

// ---- Records -------------------------------------------------------------

attendanceRouter.get("/", async (req, res) => {
  const q = z.object({ employeeId: empCode.optional(), start: dateOnly.optional(), end: dateOnly.optional() }).parse(req.query);
  const end = q.end ?? todayIST();
  const start = q.start ?? addDays(end, -30);
  if (start > end) throw badRequest("start must not be after end");
  if (addDays(start, 366) < end) throw badRequest("Date range cannot exceed one year");

  const rows = await prisma.attendanceRecord.findMany({
    where: {
      date: { gte: fromDateOnly(start)!, lte: fromDateOnly(end)! },
      employee: { is: { AND: [employeeScope(req.user!), q.employeeId ? { employeeCode: q.employeeId } : {}] } },
    },
    include: recInclude,
    orderBy: [{ date: "desc" }, { employee: { employeeCode: "asc" } }],
  });
  const pending = await prisma.attendanceCorrection.findMany({
    where: { status: "Pending", employeeId: { in: [...new Set(rows.map((r) => r.employeeId))] }, date: { gte: fromDateOnly(start)!, lte: fromDateOnly(end)! } },
    select: { employeeId: true, date: true },
  });
  const flagged = new Set(pending.map((p) => `${p.employeeId}|${toDateOnly(p.date)}`));
  res.json({ data: rows.map((r) => toRecordDto(r, flagged.has(`${r.employeeId}|${toDateOnly(r.date)}`))) });
});

/** Time is taken from the server clock - the client cannot choose it. */
attendanceRouter.post("/check-in", async (req, res) => {
  const employeeId = requireOwnEmployee(req);
  const now = new Date();
  const date = todayIST();
  const existing = await prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId, date: fromDateOnly(date)! } } });
  if (existing?.checkIn) throw conflict("You have already checked in today");

  const late = minutesOfDayIST(now) > LATE_AFTER_MINUTES;
  const data = { checkIn: now, status: late ? "Late" : "Present", source: "Web Check-in", notes: late ? "Checked in after the grace period." : "Checked in on time." };
  const rec = existing
    ? await prisma.attendanceRecord.update({ where: { id: existing.id }, data, include: recInclude })
    : await prisma.attendanceRecord.create({ data: { employeeId, date: fromDateOnly(date)!, ...data }, include: recInclude });
  res.status(201).json({ data: toRecordDto(rec) });
});

attendanceRouter.post("/check-out", async (req, res) => {
  const employeeId = requireOwnEmployee(req);
  const date = fromDateOnly(todayIST())!;
  const rec = await prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId, date } } });
  if (!rec?.checkIn) throw badRequest("You have not checked in today");
  if (rec.checkOut) throw conflict("You have already checked out today");

  const now = new Date();
  const minutes = Math.max(0, Math.round((now.getTime() - rec.checkIn.getTime()) / 60000));
  const wasLate = rec.status === "Late";
  // updateMany with checkOut:null makes a double-click race harmless.
  const r = await prisma.attendanceRecord.updateMany({
    where: { id: rec.id, checkOut: null },
    data: { checkOut: now, workDurationMinutes: minutes, status: statusFor(minutes, wasLate) },
  });
  if (r.count === 0) throw conflict("You have already checked out today");
  const updated = await prisma.attendanceRecord.findUniqueOrThrow({ where: { id: rec.id }, include: recInclude });
  res.json({ data: toRecordDto(updated) });
});

// ---- Corrections ---------------------------------------------------------

const corrInclude = { employee: { select: { id: true, employeeCode: true, fullName: true, departmentId: true } } } satisfies Prisma.AttendanceCorrectionInclude;
type Corr = Prisma.AttendanceCorrectionGetPayload<{ include: typeof corrInclude }>;

async function toCorrectionDtos(rows: Corr[]) {
  const reviewerIds = [...new Set(rows.map((r) => r.reviewedById).filter((x): x is string => !!x))];
  const reviewers = await prisma.employee.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, fullName: true } });
  const name = new Map(reviewers.map((r) => [r.id, r.fullName]));
  return rows.map((r) => ({
    id: r.id,
    employeeId: r.employee.employeeCode,
    employeeName: r.employee.fullName,
    date: toDateOnly(r.date)!,
    originalCheckIn: fmtTime(r.originalCheckIn) ?? "--:--",
    originalCheckOut: fmtTime(r.originalCheckOut) ?? "--:--",
    requestedCheckIn: fmtTime(r.requestedCheckIn)!,
    requestedCheckOut: fmtTime(r.requestedCheckOut)!,
    reason: r.reason,
    status: r.status,
    requestedAt: fmtDateTime(r.requestedAt)!,
    reviewedBy: r.reviewedById ? name.get(r.reviewedById) : undefined,
    reviewedAt: fmtDateTime(r.reviewedAt),
    reviewerComments: r.reviewerComments ?? undefined,
  }));
}

attendanceRouter.get("/corrections", async (req, res) => {
  const q = z.object({ status: z.enum(["Pending", "Approved", "Rejected"]).optional() }).parse(req.query);
  const rows = await prisma.attendanceCorrection.findMany({
    where: { ...(q.status ? { status: q.status } : {}), employee: { is: employeeScope(req.user!) } },
    include: corrInclude,
    orderBy: { requestedAt: "desc" },
  });
  res.json({ data: await toCorrectionDtos(rows) });
});

const correctionSchema = z.object({
  date: dateOnly,
  requestedCheckIn: clock,
  requestedCheckOut: clock,
  reason: z.string().trim().min(10, "Please explain the reason (min 10 characters)").max(500),
});

/** Employee is always the signed-in user - a body `employeeId` is ignored. */
attendanceRouter.post("/corrections", async (req, res) => {
  const employeeId = requireOwnEmployee(req);
  const b = correctionSchema.parse(req.body);
  const today = todayIST();
  if (b.date > today) throw badRequest("Cannot request a correction for a future date");
  if (b.date < addDays(today, -CORRECTION_WINDOW_DAYS)) throw badRequest(`Corrections are allowed only for the last ${CORRECTION_WINDOW_DAYS} days`);

  const inT = istToUtc(b.date, parseClock(b.requestedCheckIn)!);
  const outT = istToUtc(b.date, parseClock(b.requestedCheckOut)!);
  if (outT <= inT) throw badRequest("Check-out must be after check-in");

  const date = fromDateOnly(b.date)!;
  if (await prisma.attendanceCorrection.findFirst({ where: { employeeId, date, status: "Pending" } }))
    throw conflict("A correction request for this date is already pending");
  const original = await prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId, date } } });

  const created = await prisma.attendanceCorrection.create({
    data: { employeeId, date, originalCheckIn: original?.checkIn, originalCheckOut: original?.checkOut, requestedCheckIn: inT, requestedCheckOut: outT, reason: b.reason },
    include: corrInclude,
  });
  const emp = created.employee;
  const mgr = await prisma.employee.findUnique({ where: { id: employeeId }, select: { reportingManagerId: true } });
  const msg = { title: "Attendance correction requested", message: `${emp.fullName} requested a correction for ${b.date}.`, category: "Attendance" as const, link: "/attendance" };
  if (mgr?.reportingManagerId) await notifyEmployees([mgr.reportingManagerId], msg);
  else await notifyHrAdmins(msg);

  await writeAudit({ req, action: "Correction requested", module: "Attendance", recordId: created.id, description: `Correction requested for ${emp.employeeCode} on ${b.date}` });
  res.status(201).json({ data: (await toCorrectionDtos([created]))[0] });
});

const reviewSchema = z.object({ decision: z.enum(["Approved", "Rejected"]), notes: z.string().trim().max(500).optional() });

attendanceRouter.patch("/corrections/:id/review", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { decision, notes } = reviewSchema.parse(req.body);
  const user = req.user!;

  const corr = await prisma.attendanceCorrection.findUnique({ where: { id }, include: corrInclude });
  if (!corr || !(await prisma.employee.findFirst({ where: { AND: [{ id: corr.employeeId }, employeeScope(user)] } }))) throw notFound("Correction request not found");
  if (user.employeeId === corr.employeeId) throw forbidden("You cannot review your own request");
  if (!canReviewFor(user, corr.employee)) throw forbidden();
  if (decision === "Rejected" && !notes) throw badRequest("Please provide a reason when rejecting");

  await prisma.$transaction(async (tx) => {
    const r = await tx.attendanceCorrection.updateMany({
      where: { id, status: "Pending" },
      data: { status: decision, reviewedById: user.employeeId, reviewedAt: new Date(), reviewerComments: notes },
    });
    if (r.count === 0) throw conflict("This request has already been reviewed");
    if (decision === "Approved") {
      const minutes = Math.round((corr.requestedCheckOut.getTime() - corr.requestedCheckIn.getTime()) / 60000);
      const wasLate = minutesOfDayIST(corr.requestedCheckIn) > LATE_AFTER_MINUTES;
      const data = {
        checkIn: corr.requestedCheckIn, checkOut: corr.requestedCheckOut, workDurationMinutes: minutes,
        status: statusFor(minutes, wasLate), source: "Manual Entry", notes: `Corrected via approved request: ${corr.reason}`,
      };
      await tx.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId: corr.employeeId, date: corr.date } },
        update: data, create: { employeeId: corr.employeeId, date: corr.date, ...data },
      });
    }
  });

  await notifyEmployees([corr.employeeId], {
    title: `Correction ${decision.toLowerCase()}`, message: `Your attendance correction for ${toDateOnly(corr.date)} was ${decision.toLowerCase()}.`,
    category: "Attendance", link: "/attendance",
  });
  await writeAudit({ req, action: `Correction ${decision.toLowerCase()}`, module: "Attendance", recordId: id, description: `${decision} correction for ${corr.employee.employeeCode} on ${toDateOnly(corr.date)}` });
  const fresh = await prisma.attendanceCorrection.findUniqueOrThrow({ where: { id }, include: corrInclude });
  res.json({ data: (await toCorrectionDtos([fresh]))[0] });
});
