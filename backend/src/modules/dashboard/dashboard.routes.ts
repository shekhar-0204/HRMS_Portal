import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { prisma } from "../../lib/db";
import { can } from "../../lib/permissions";
import { employeeScope } from "../../lib/access";
import { dayName, fmtTime, todayIST } from "../../lib/time";
import { fromDateOnly, toDateOnly } from "../../lib/dates";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

/**
 * One call returns what the signed-in role may see:
 *  - `me`   : personal summary (everyone with an employee record)
 *  - `team` : company numbers for HR / Super Admin, department numbers for managers (absent for employees)
 */
dashboardRouter.get("/", async (req, res) => {
  const user = req.user!;
  const today = todayIST(), dToday = fromDateOnly(today)!, year = Number(today.slice(0, 4));

  const [holidays, unread] = await Promise.all([
    prisma.holiday.findMany({ where: { date: { gte: dToday } }, orderBy: { date: "asc" }, take: 5 }),
    prisma.notification.count({ where: { recipientId: user.id, read: false } }),
  ]);

  let me = null;
  if (user.employeeId) {
    const [rec, balances, pending] = await Promise.all([
      prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: user.employeeId, date: dToday } } }),
      prisma.leaveBalance.findMany({ where: { employeeId: user.employeeId, year }, include: { leaveType: true } }),
      prisma.leaveRequest.count({ where: { employeeId: user.employeeId, status: "Pending" } }),
    ]);
    me = {
      attendanceToday: rec ? { status: rec.status, checkIn: fmtTime(rec.checkIn), checkOut: fmtTime(rec.checkOut) } : null,
      leaveBalances: balances.map((b) => ({
        leaveTypeCode: b.leaveType.code, leaveTypeName: b.leaveType.name,
        available: Number(b.totalQuota) - Number(b.consumed) - Number(b.pending),
      })),
      pendingLeaveRequests: pending,
    };
  }

  let team = null;
  if (can(user.role, "employees:read:all") || can(user.role, "employees:read:team")) {
    const scope = employeeScope(user);
    const notMine = user.employeeId ? { employeeId: { not: user.employeeId } } : {}; // you cannot approve your own requests
    const [emps, todays, onLeave, pendingLeaves, pendingCorrections] = await Promise.all([
      prisma.employee.findMany({ where: scope, select: { id: true, status: true, employmentType: true } }),
      prisma.attendanceRecord.findMany({ where: { date: dToday, employee: { is: scope } }, select: { employeeId: true, status: true, checkIn: true } }),
      prisma.leaveRequest.findMany({ where: { status: "Approved", startDate: { lte: dToday }, endDate: { gte: dToday }, employee: { is: scope } }, select: { employeeId: true } }),
      prisma.leaveRequest.count({ where: { status: "Pending", ...notMine, employee: { is: scope } } }),
      prisma.attendanceCorrection.count({ where: { status: "Pending", ...notMine, employee: { is: scope } } }),
    ]);
    const active = emps.filter((e) => e.status !== "Inactive");
    const accounted = new Set([...todays.filter((t) => t.checkIn).map((t) => t.employeeId), ...onLeave.map((l) => l.employeeId)]);
    team = {
      totalEmployees: emps.length,
      activeEmployees: emps.filter((e) => e.status === "Active").length,
      interns: emps.filter((e) => e.employmentType === "Intern" && e.status !== "Inactive").length,
      today: {
        present: todays.filter((t) => t.status === "Present" || t.status === "Late").length,
        late: todays.filter((t) => t.status === "Late").length,
        onLeave: new Set(onLeave.map((l) => l.employeeId)).size,
        notCheckedIn: active.filter((e) => !accounted.has(e.id)).length,
      },
      pendingApprovals: { leave: pendingLeaves, attendanceCorrections: pendingCorrections },
    };
  }

  res.json({
    data: {
      role: user.role, date: today, me, team, unreadNotifications: unread,
      upcomingHolidays: holidays.map((h) => ({ id: h.id, name: h.name, date: toDateOnly(h.date)!, dayOfWeek: dayName(toDateOnly(h.date)!), type: h.type })),
    },
  });
});
