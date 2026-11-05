/**
 * End-to-end smoke test against a RUNNING server (npm run dev in another terminal).
 * Uses the seeded demo accounts. Safe to re-run; it creates one throw-away employee and one leave request per run.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}/api/v1`;
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "ChangeMe@12345";

let passed = 0, failed = 0;
const check = (name: string, ok: boolean, extra?: unknown) => {
  ok ? passed++ : failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${JSON.stringify(extra)}`}`);
};

class Client {
  cookie = "";
  async call(method: string, path: string, body?: unknown) {
    const res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const sc = res.headers.getSetCookie?.()[0];
    if (sc) this.cookie = sc.split(";")[0];
    const text = await res.text();
    let json: any = undefined;
    try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
    return { status: res.status, json };
  }
  async login(email: string, password = PASSWORD) { return this.call("POST", "/auth/login", { email, password }); }
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
function futureWeekday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 14 + Math.floor(Math.random() * 200));
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return ymd(d);
}

async function main() {
  console.log(`Testing ${BASE}\n`);

  // --- Auth
  const anon = new Client();
  check("health", (await anon.call("GET", "/health")).status === 200);
  check("protected route without login -> 401", (await anon.call("GET", "/employees")).status === 401);
  check("wrong password -> 401", (await new Client().login("rohit.mehta@graapes.com", "wrong-password")).status === 401);
  check("unknown email -> 401", (await new Client().login("nobody@graapes.com")).status === 401);

  const rohit = new Client(), hr = new Client(), mgr = new Client(), admin = new Client();
  const r = await rohit.login("rohit.mehta@graapes.com");
  check("employee login", r.status === 200 && r.json?.user?.role === "employee", r);
  check("login response has no password hash", !JSON.stringify(r.json).includes("passwordHash"));
  check("/auth/me", (await rohit.call("GET", "/auth/me")).json?.user?.employeeId === "GRP-014");
  check("hr login", (await hr.login("hr.admin@graapes.com")).status === 200);
  check("manager login", (await mgr.login("manager.eng@graapes.com")).status === 200);
  check("super admin login", (await admin.login("superadmin@graapes.com")).status === 200);

  // --- Employees: scoping & permissions
  const eRohit = await rohit.call("GET", "/employees");
  check("employee sees only self", eRohit.json?.data?.length === 1 && eRohit.json.data[0].employeeId === "GRP-014", eRohit.json);
  const eMgr = await mgr.call("GET", "/employees");
  const mgrRows: any[] = eMgr.json?.data ?? [];
  check("manager sees own department only", mgrRows.length >= 3 && new Set(mgrRows.map((e) => e.departmentId)).size === 1
    && mgrRows.some((e) => e.employeeId === "GRP-003") && !mgrRows.some((e) => e.employeeId === "GRP-002"), mgrRows.map((e) => e.employeeId));
  const eHr = await hr.call("GET", "/employees");
  check("hr sees all (>= 4)", eHr.json?.data?.length >= 4, eHr.status);
  check("employee cannot create employee -> 403", (await rohit.call("POST", "/employees", {})).status === 403);
  check("employee cannot read another employee -> 404", (await rohit.call("GET", `/employees/${eHr.json.data.find((e: any) => e.employeeId === "GRP-001").id}`)).status === 404);

  const depts = (await hr.call("GET", "/departments")).json?.data ?? [];
  const eng = depts.find((d: any) => d.code === "ENG");
  const des = ((await hr.call("GET", "/designations")).json?.data ?? []).find((d: any) => d.title === "Frontend Engineer");
  check("departments & designations load", !!eng && !!des);

  const stamp = Date.now();
  const bad = await hr.call("POST", "/employees", { fullName: "X" });
  check("create employee with invalid body -> 400", bad.status === 400, bad.json);
  const created = await hr.call("POST", "/employees", {
    fullName: "Smoke Test", workEmail: `smoke.${stamp}@graapes.com`, phone: "+91 90000 00000", gender: "Other",
    joiningDate: ymd(new Date()), employmentType: "Intern", departmentId: eng?.id, designationId: des?.id, workLocation: "Remote",
  });
  check("hr creates employee with auto GRP id", created.status === 201 && /^GRP-\d{3,}$/.test(created.json?.data?.employeeId), created.json);
  const dup = await hr.call("POST", "/employees", {
    fullName: "Smoke Test", workEmail: `smoke.${stamp}@graapes.com`, phone: "+91 90000 00000", gender: "Other",
    joiningDate: ymd(new Date()), employmentType: "Intern", departmentId: eng?.id, designationId: des?.id, workLocation: "Remote",
  });
  check("duplicate work email -> 409", dup.status === 409, dup.json);
  if (created.json?.data?.id) {
    check("hr deactivates employee", (await hr.call("PATCH", `/employees/${created.json.data.id}/deactivate`, {})).status === 200);
    check("PATCH status=Inactive is blocked", (await hr.call("PATCH", `/employees/${eHr.json.data[0].id}`, { status: "Inactive" })).status === 400);
  }
  check("hr cannot deactivate self -> 400", (await hr.call("PATCH", `/employees/${eHr.json.data.find((e: any) => e.employeeId === "GRP-002").id}/deactivate`, {})).status === 400);

  // --- Attendance (reset today's record for the demo employee so the punch path is tested on every run)
  const db = new PrismaClient();
  const istToday = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  await db.attendanceRecord.deleteMany({ where: { employee: { employeeCode: "GRP-014" }, date: new Date(`${istToday}T00:00:00.000Z`) } });
  await db.$disconnect();
  const ci = await rohit.call("POST", "/attendance/check-in");
  check("check-in (201, or 409 if already done today)", [201, 409].includes(ci.status), ci.json);
  if (ci.status === 201) {
    check("check-in time comes from server", !!ci.json.data.checkIn && ci.json.data.employeeId === "GRP-014");
    check("second check-in -> 409", (await rohit.call("POST", "/attendance/check-in")).status === 409);
    const co = await rohit.call("POST", "/attendance/check-out");
    check("check-out computes duration on server", co.status === 200 && typeof co.json?.data?.workDurationHours === "number", co.json);
    check("second check-out -> 409", (await rohit.call("POST", "/attendance/check-out")).status === 409);
  }
  const att = await rohit.call("GET", "/attendance");
  check("attendance list", att.status === 200 && Array.isArray(att.json?.data), att.json);
  check("future-dated correction -> 400", (await rohit.call("POST", "/attendance/corrections", { date: "2999-01-01", requestedCheckIn: "09:30 AM", requestedCheckOut: "06:30 PM", reason: "Testing future date" })).status === 400);

  // --- Leave
  const day = futureWeekday();
  const yr = day.slice(0, 4);
  const bal = await rohit.call("GET", `/leave/balances?year=${yr}`);
  const cl0 = bal.json?.data?.find((b: any) => b.leaveTypeCode === "CL");
  check("leave balances provisioned", bal.status === 200 && !!cl0, bal.json);

  const apply = await rohit.call("POST", "/leave/requests", { leaveTypeCode: "CL", startDate: day, endDate: day, reason: "Smoke test leave" });
  check("apply leave -> 201 Pending, 1 day", apply.status === 201 && apply.json?.data?.status === "Pending" && apply.json.data.durationDays === 1, apply.json);
  const id = apply.json?.data?.id;
  check("overlapping leave -> 409", (await rohit.call("POST", "/leave/requests", { leaveTypeCode: "CL", startDate: day, endDate: day, reason: "Overlap attempt" })).status === 409);
  check("weekend-only leave -> 400", (await rohit.call("POST", "/leave/requests", { leaveTypeCode: "CL", startDate: nextSat(), endDate: nextSat(), reason: "Weekend attempt" })).status === 400);
  check("over-balance leave -> 400", (await rohit.call("POST", "/leave/requests", { leaveTypeCode: "COMP", startDate: ymd(plus(400)), endDate: ymd(plus(430)), reason: "Way too long" })).status === 400);

  const pendingBal = (await rohit.call("GET", `/leave/balances?year=${yr}`)).json?.data?.find((b: any) => b.leaveTypeCode === "CL");
  check("pending balance reserved", pendingBal?.pendingApproval === cl0.pendingApproval + 1, { before: cl0, after: pendingBal });

  if (id) {
    check("employee cannot approve own leave -> 403", (await rohit.call("PATCH", `/leave/requests/${id}/review`, { decision: "Approved" })).status === 403);
    check("reject without reason -> 400", (await mgr.call("PATCH", `/leave/requests/${id}/review`, { decision: "Rejected" })).status === 400);
    const ok = await mgr.call("PATCH", `/leave/requests/${id}/review`, { decision: "Approved", notes: "Enjoy" });
    check("manager approves", ok.status === 200 && ok.json?.data?.status === "Approved", ok.json);
    check("double review -> 409", (await hr.call("PATCH", `/leave/requests/${id}/review`, { decision: "Approved" })).status === 409);
    const after = (await rohit.call("GET", `/leave/balances?year=${yr}`)).json?.data?.find((b: any) => b.leaveTypeCode === "CL");
    check("balance: pending released, consumed +1", after?.pendingApproval === cl0.pendingApproval && after?.consumed === cl0.consumed + 1, { before: cl0, after });
    check("cancel after approval -> 409", (await rohit.call("POST", `/leave/requests/${id}/cancel`)).status === 409);
    check("history recorded", (await rohit.call("GET", "/leave/requests")).json?.data?.find((x: any) => x.id === id)?.history?.length === 2);
  }

  // second request: cancel path
  const d2 = futureWeekday();
  const a2 = await rohit.call("POST", "/leave/requests", { leaveTypeCode: "CL", startDate: d2, endDate: d2, reason: "Cancel path test" });
  if (a2.status === 201) {
    const c = await rohit.call("POST", `/leave/requests/${a2.json.data.id}/cancel`);
    check("cancel pending leave", c.status === 200 && c.json?.data?.status === "Cancelled", c.json);
  } else check("second leave (cancel path) applied", a2.status === 409, a2.json); // 409 = random date collided; fine

  // --- Logout
  check("logout -> 204", (await rohit.call("POST", "/auth/logout")).status === 204);
  check("session dead after logout -> 401", (await rohit.call("GET", "/auth/me")).status === 401);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

function plus(n: number) { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d; }
function nextSat() { const d = plus(7); while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1); return ymd(d); }

main().catch((e) => { console.error("Smoke test crashed:", e); process.exit(1); });
