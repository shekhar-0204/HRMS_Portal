/**
 * Phase 2 smoke test: users & roles, password change, holidays, notifications, announcements,
 * documents, audit logs, reports, dashboard, settings, leave -> attendance.
 * Run against a RUNNING server (after `npm run smoke`). Safe to re-run.
 */
import "dotenv/config";

const BASE = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}/api/v1`;
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "ChangeMe@12345";

let passed = 0, failed = 0;
const check = (name: string, ok: boolean, extra?: unknown) => {
  ok ? passed++ : failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${JSON.stringify(extra)}`}`);
};

class Client {
  cookie = "";
  private async send(method: string, path: string, init: { body?: BodyInit; json?: unknown }) {
    const headers: Record<string, string> = {};
    if (this.cookie) headers.Cookie = this.cookie;
    if (init.json !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(BASE + path, { method, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body });
    const sc = res.headers.getSetCookie?.()[0];
    if (sc) this.cookie = sc.split(";")[0];
    return res;
  }
  async call(method: string, path: string, body?: unknown) {
    const res = await this.send(method, path, { json: body });
    const text = await res.text();
    let json: any; try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
    return { status: res.status, json, headers: res.headers };
  }
  async raw(path: string) {
    const res = await this.send("GET", path, {});
    return { status: res.status, type: res.headers.get("content-type") ?? "", disposition: res.headers.get("content-disposition") ?? "", buf: Buffer.from(await res.arrayBuffer()) };
  }
  async upload(path: string, fields: Record<string, string>, file: { bytes: Buffer | Uint8Array; name: string; type?: string } | null) {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    if (file) form.append("file", new Blob([new Uint8Array(file.bytes)], { type: file.type ?? "application/pdf" }), file.name);
    const res = await this.send("POST", path, { body: form });
    const text = await res.text();
    let json: any; try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
    return { status: res.status, json };
  }
  login(email: string, password = PASSWORD) { return this.call("POST", "/auth/login", { email, password }); }
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const plus = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d; };
function futureWeekday(minDays = 14, spread = 200): string {
  const d = plus(minDays + Math.floor(Math.random() * spread));
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return ymd(d);
}
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

async function main() {
  console.log(`Testing ${BASE}\n`);
  const sa = new Client(), hr = new Client(), mgr = new Client(), rohit = new Client();
  for (const [c, e] of [[sa, "superadmin@graapes.com"], [hr, "hr.admin@graapes.com"], [mgr, "manager.eng@graapes.com"], [rohit, "rohit.mehta@graapes.com"]] as const)
    if ((await c.login(e)).status !== 200) throw new Error(`login failed for ${e} - run the seed first`);

  // ---------------- Roles matrix
  const m = await rohit.call("GET", "/roles/matrix");
  check("roles matrix has 19 rows", m.status === 200 && m.json.data.length === 19, m.json);
  const adminRow = m.json?.data?.find((r: any) => r.module === "User & Role Administration");
  check("matrix: only Super Admin administers users", adminRow?.super_admin === true && adminRow?.hr_admin === false && adminRow?.manager === false && adminRow?.employee === false, adminRow);

  // ---------------- Users & password lifecycle
  check("employee cannot list users -> 403", (await rohit.call("GET", "/users")).status === 403);
  check("HR cannot list users -> 403 (Super Admin only)", (await hr.call("GET", "/users")).status === 403);
  const users = await sa.call("GET", "/users");
  check("super admin lists users", users.status === 200 && users.json.data.length >= 4 && users.json.data[0].status, users.status);

  const stamp = Date.now();
  const depts = (await hr.call("GET", "/departments")).json.data;
  const eng = depts.find((d: any) => d.code === "ENG");
  const des = (await hr.call("GET", "/designations")).json.data.find((d: any) => d.title === "Frontend Engineer");
  const mkEmp = async (name: string, email: string) => hr.call("POST", "/employees", {
    fullName: name, workEmail: email, phone: "+91 90000 00000", gender: "Other", joiningDate: ymd(new Date()),
    employmentType: "Full-Time", departmentId: eng.id, designationId: des.id, workLocation: "Remote",
  });
  const newEmp = await mkEmp("Account Test", `acct.${stamp}@graapes.com`);
  const code = newEmp.json?.data?.employeeId;
  check("setup: HR creates an employee", newEmp.status === 201 && !!code, newEmp.json);

  const noAcct = await sa.call("POST", "/users", { employeeId: code, role: "superman" });
  check("invalid role -> 400", noAcct.status === 400, noAcct.json);
  check("employee cannot create accounts -> 403", (await rohit.call("POST", "/users", { employeeId: code, role: "employee" })).status === 403);
  // POST /employees now creates the employee AND its login atomically and returns the temporary credentials once.
  const cred = newEmp.json?.temporaryCredentials;
  check("HR onboarding returns a login with a temp password (once)", typeof cred?.password === "string" && cred.password.length >= 12 && cred.mustChangePassword === true && cred.role === "employee", newEmp.json);
  const acct = { json: newEmp.json };
  const listed = (await sa.call("GET", "/users")).json?.data ?? [];
  const userId = listed.find((u: any) => u.email === `acct.${stamp}@graapes.com`)?.id, temp = cred?.password;
  check("the new login exists and is flagged mustChangePassword", !!userId && listed.find((u: any) => u.id === userId)?.mustChangePassword === true);
  check("duplicate account -> 409", (await hr.call("POST", "/users", { employeeId: code, role: "employee" })).status === 409);
  check("HR cannot reset passwords -> 403 (Super Admin only)", (await hr.call("POST", `/users/${userId}/reset-password`)).status === 403);
  check("HR cannot change roles -> 403 (Super Admin only)", (await hr.call("PATCH", `/users/${userId}/role`, { role: "hr_admin" })).status === 403);
  check("HR cannot deactivate accounts via /users -> 403", (await hr.call("PATCH", `/users/${userId}/status`, { isActive: false })).status === 403);
  const emp2 = await mkEmp("Elevation Test", `elev.${stamp}@graapes.com`);
  const code2 = emp2.json?.data?.employeeId;
  check("HR cannot create a Super Admin login -> 403 (no privilege escalation)", (await hr.call("POST", "/users", { employeeId: code2, role: "super_admin" })).status === 403);
  check("HR cannot create an HR Admin or manager login -> 403", (await hr.call("POST", "/users", { employeeId: code2, role: "hr_admin" })).status === 403 && (await hr.call("POST", "/users", { employeeId: code2, role: "department_manager" })).status === 403);
  // every employee already has a login (created with the profile), so a second one is refused even for a Super Admin
  check("Super Admin cannot create a duplicate login -> 409", (await sa.call("POST", "/users", { employeeId: code2, role: "department_manager" })).status === 409);
  if (emp2.json?.data?.id) await hr.call("PATCH", `/employees/${emp2.json.data.id}/deactivate`, {});
  check("response never contains a password hash", !JSON.stringify(acct.json).includes("passwordHash"));

  const nu = new Client(), nu2 = new Client();
  const l1 = await nu.login(`acct.${stamp}@graapes.com`, temp);
  check("new user logs in with temp password; mustChangePassword = true", l1.status === 200 && l1.json?.user?.mustChangePassword === true, l1.json);
  await nu2.login(`acct.${stamp}@graapes.com`, temp);
  const blocked = await nu.call("GET", "/employees");
  check("API blocked until password changed (403 PASSWORD_CHANGE_REQUIRED)", blocked.status === 403 && blocked.json?.details?.code === "PASSWORD_CHANGE_REQUIRED", blocked.json);
  check("/auth/me still works while change is pending", (await nu.call("GET", "/auth/me")).status === 200);
  check("weak new password -> 400", (await nu.call("POST", "/auth/change-password", { currentPassword: temp, newPassword: "short" })).status === 400);
  check("wrong current password -> 400", (await nu.call("POST", "/auth/change-password", { currentPassword: "WrongOne123", newPassword: "Brand-New-Pass1" })).status === 400);
  const NEWPW = "Brand-New-Pass1";
  check("change password succeeds", (await nu.call("POST", "/auth/change-password", { currentPassword: temp, newPassword: NEWPW })).status === 200);
  check("other sessions revoked after password change", (await nu2.call("GET", "/auth/me")).status === 401);
  check("API works after password change", (await nu.call("GET", "/employees")).status === 200);
  check("old temp password no longer works", (await new Client().login(`acct.${stamp}@graapes.com`, temp)).status === 401);

  check("super admin cannot change own role -> 400", (await sa.call("PATCH", `/users/${users.json.data.find((u: any) => u.email === "superadmin@graapes.com").id}/role`, { role: "employee" })).status === 400);
  const roleUp = await sa.call("PATCH", `/users/${userId}/role`, { role: "department_manager" });
  check("super admin changes a role", roleUp.status === 200 && roleUp.json?.data?.role === "department_manager", roleUp.json);
  const deact = await sa.call("PATCH", `/users/${userId}/status`, { isActive: false });
  check("deactivate account", deact.status === 200 && deact.json?.data?.status === "Inactive", deact.json);
  check("deactivated user's session is killed", (await nu.call("GET", "/auth/me")).status === 401);
  check("deactivated user cannot log in", (await new Client().login(`acct.${stamp}@graapes.com`, NEWPW)).status === 401);
  check("reactivate account", (await sa.call("PATCH", `/users/${userId}/status`, { isActive: true })).status === 200);
  const reset = await sa.call("POST", `/users/${userId}/reset-password`);
  check("admin resets password (new temp returned)", reset.status === 200 && typeof reset.json?.temporaryPassword === "string", reset.json);
  const afterReset = await new Client().login(`acct.${stamp}@graapes.com`, reset.json?.temporaryPassword);
  check("after reset user must change password again", afterReset.status === 200 && afterReset.json?.user?.mustChangePassword === true, afterReset.json);
  check("cannot deactivate own account -> 400", (await sa.call("PATCH", `/users/${users.json.data.find((u: any) => u.email === "superadmin@graapes.com").id}/status`, { isActive: false })).status === 400);
  await hr.call("PATCH", `/employees/${newEmp.json.data.id}/deactivate`, {});

  // ---------------- Holidays
  check("anyone can list holidays", (await rohit.call("GET", "/holidays")).status === 200);
  const hday = futureWeekday(20, 150);
  const hBody = { name: `Smoke Holiday ${stamp}`, date: hday, type: "Company Festival" };
  check("employee cannot add holiday -> 403", (await rohit.call("POST", "/holidays", hBody)).status === 403);
  const h = await hr.call("POST", "/holidays", hBody);
  check("HR adds holiday (dayOfWeek computed)", h.status === 201 && typeof h.json?.data?.dayOfWeek === "string", h.json);
  check("duplicate holiday -> 409", (await hr.call("POST", "/holidays", hBody)).status === 409);
  check("invalid holiday type -> 400", (await hr.call("POST", "/holidays", { ...hBody, name: "x2", type: "Party" })).status === 400);
  const onHoliday = await rohit.call("POST", "/leave/requests", { leaveTypeCode: "CL", startDate: hday, endDate: hday, reason: "Holiday overlap test" });
  check("leave on a company holiday has no working days -> 400", onHoliday.status === 400, onHoliday.json);
  check("HR deletes holiday -> 204", (await hr.call("DELETE", `/holidays/${h.json?.data?.id}`)).status === 204);
  check("delete again -> 404", (await hr.call("DELETE", `/holidays/${h.json?.data?.id}`)).status === 404);

  // ---------------- Leave approval -> attendance "Leave"
  let day = "", applied: any;
  for (let i = 0; i < 6; i++) {
    day = futureWeekday(30, 120);
    applied = await rohit.call("POST", "/leave/requests", { leaveTypeCode: "CL", startDate: day, endDate: day, reason: "Attendance link test" });
    if (applied.status === 201) break;
  }
  check("setup: Rohit applies for leave", applied.status === 201, applied.json);
  await mgr.call("PATCH", `/leave/requests/${applied.json?.data?.id}/review`, { decision: "Approved", notes: "ok" });
  const att = await rohit.call("GET", `/attendance?start=${day}&end=${day}`);
  check("approved leave appears on attendance as 'Leave'", att.json?.data?.length === 1 && att.json.data[0].status === "Leave", att.json);

  // ---------------- Notifications
  const n1 = await rohit.call("GET", "/notifications");
  check("notifications list with unreadCount", n1.status === 200 && n1.json.unreadCount >= 1 && n1.json.data.length >= 1, n1.json);
  const nid = n1.json?.data?.find((n: any) => !n.read)?.id;
  check("another user cannot mark my notification -> 404", (await mgr.call("PATCH", `/notifications/${nid}/read`)).status === 404);
  check("mark one read", (await rohit.call("PATCH", `/notifications/${nid}/read`)).status === 200);
  check("read-all", (await rohit.call("PATCH", "/notifications/read-all")).status === 200);
  check("unreadCount is 0 after read-all", (await rohit.call("GET", "/notifications")).json?.unreadCount === 0);
  check("unread filter returns only unread", (await rohit.call("GET", "/notifications?unread=true")).json?.data?.every((n: any) => !n.read));

  // ---------------- Settings (and opt-out of in-app notifications)
  const s0 = await rohit.call("GET", "/settings/me");
  check("settings default to Asia/Kolkata", s0.status === 200 && s0.json?.data?.timezone === "Asia/Kolkata", s0.json);
  check("non-IST timezone rejected -> 400", (await rohit.call("PATCH", "/settings/me", { timezone: "UTC" })).status === 400);
  check("unknown settings key rejected -> 400", (await rohit.call("PATCH", "/settings/me", { role: "super_admin" })).status === 400);
  const s1 = await rohit.call("PATCH", "/settings/me", { dateFormat: "YYYY-MM-DD", inAppNotifications: false });
  check("update settings", s1.status === 200 && s1.json?.data?.dateFormat === "YYYY-MM-DD" && s1.json.data.inAppNotifications === false, s1.json);

  // ---------------- Announcements
  const annAll = { title: `All hands ${stamp}`, content: "Quarterly update for everyone.", category: "General", priority: "Medium", targetAudience: "All Employees" };
  check("employee cannot publish -> 403", (await rohit.call("POST", "/announcements", annAll)).status === 403);
  check("past expiry -> 400", (await hr.call("POST", "/announcements", { ...annAll, expiryDate: "2020-01-01" })).status === 400);
  const unreadBefore = (await rohit.call("GET", "/notifications")).json.unreadCount;
  const a1 = await hr.call("POST", "/announcements", annAll);
  check("HR publishes to all employees", a1.status === 201 && a1.json?.data?.targetAudience === "All Employees", a1.json);
  check("opted-out user gets no in-app notification", (await rohit.call("GET", "/notifications")).json.unreadCount === unreadBefore);
  await rohit.call("PATCH", "/settings/me", { inAppNotifications: true, dateFormat: "DD-MMM-YYYY" });
  const a2 = await hr.call("POST", "/announcements", { ...annAll, title: `Managers only ${stamp}`, targetAudience: "Managers" });
  check("HR publishes managers-only", a2.status === 201, a2.json);
  const a3 = await hr.call("POST", "/announcements", { ...annAll, title: `HR dept only ${stamp}`, targetAudience: "Department", targetDepartmentId: depts.find((d: any) => d.code === "HR").id });
  check("HR publishes department-only", a3.status === 201, a3.json);
  const seen = async (c: Client) => (await c.call("GET", "/announcements")).json?.data?.map((a: any) => a.title) ?? [];
  const rSeen = await seen(rohit), mSeen = await seen(mgr), hSeen = await seen(hr);
  check("employee sees 'all' but not managers-only or other-department", rSeen.includes(annAll.title) && !rSeen.some((t: string) => t.startsWith("Managers only")) && !rSeen.some((t: string) => t.startsWith("HR dept only")), rSeen);
  check("manager sees managers-only", mSeen.some((t: string) => t.startsWith("Managers only")) && !mSeen.some((t: string) => t.startsWith("HR dept only")), mSeen);
  check("HR sees everything", hSeen.length >= 3);
  const mn = await mgr.call("GET", "/notifications");
  check("announcement notified the audience", mn.json?.data?.some((n: any) => n.category === "Announcement"), mn.json?.data?.slice(0, 3));

  // ---------------- Documents
  const up = await rohit.upload("/documents", { title: "PAN card", category: "Identification" }, { bytes: PDF, name: "../../evil name!.pdf" });
  check("employee uploads a PDF", up.status === 201 && up.json?.data?.verified === false, up.json);
  const docId = up.json?.data?.id;
  check("stored file name is sanitised", !/[\\/]|\.\./.test(up.json?.data?.fileName ?? "/"), up.json?.data?.fileName);
  const fake = await rohit.upload("/documents", { title: "Not a pdf", category: "Other" }, { bytes: Buffer.from("MZ\x90\x00 this is an executable"), name: "invoice.pdf", type: "application/pdf" });
  check("disguised executable rejected -> 400", fake.status === 400, fake.json);
  const big = await rohit.upload("/documents", { title: "Huge", category: "Other" }, { bytes: Buffer.concat([PDF, Buffer.alloc(6 * 1024 * 1024)]), name: "big.pdf" });
  check("oversize file rejected -> 413", big.status === 413, big.json);
  check("missing file -> 400", (await rohit.upload("/documents", { title: "No file", category: "Other" }, null)).status === 400);
  check("bad category -> 400", (await rohit.upload("/documents", { title: "Bad cat", category: "Secrets" }, { bytes: PDF, name: "a.pdf" })).status === 400);
  check("employee cannot upload to someone else -> 403", (await rohit.upload("/documents", { title: "Sneaky", category: "Other", employeeId: "GRP-003" }, { bytes: PDF, name: "a.pdf" })).status === 403);
  check("employee lists own documents", (await rohit.call("GET", "/documents")).json?.data?.some((d: any) => d.id === docId));
  check("manager does not see others' documents", !(await mgr.call("GET", "/documents")).json?.data?.some((d: any) => d.id === docId));
  check("manager download of others' document -> 404", (await mgr.raw(`/documents/${docId}/download`)).status === 404);
  const dl = await rohit.raw(`/documents/${docId}/download`);
  check("owner downloads the real file", dl.status === 200 && dl.type.startsWith("application/pdf") && dl.buf.subarray(0, 4).toString() === "%PDF" && dl.disposition.includes("attachment"), { s: dl.status, t: dl.type, d: dl.disposition });
  const hdl = await hr.raw(`/documents/${docId}/download`);
  check("HR can download any document", hdl.status === 200 && hdl.buf.equals(dl.buf));
  check("employee cannot verify -> 403", (await rohit.call("PATCH", `/documents/${docId}/verify`, { verified: true })).status === 403);
  const ver = await hr.call("PATCH", `/documents/${docId}/verify`, { verified: true });
  check("HR verifies", ver.status === 200 && ver.json?.data?.verified === true, ver.json);
  check("owner cannot delete a verified document -> 403", (await rohit.call("DELETE", `/documents/${docId}`)).status === 403);
  check("HR deletes document -> 204", (await hr.call("DELETE", `/documents/${docId}`)).status === 204);
  check("download after delete -> 404", (await hr.raw(`/documents/${docId}/download`)).status === 404);

  // ---------------- Audit logs
  check("employee cannot read audit logs -> 403", (await rohit.call("GET", "/audit-logs")).status === 403);
  check("manager cannot read audit logs -> 403", (await mgr.call("GET", "/audit-logs")).status === 403);
  const au = await hr.call("GET", "/audit-logs");
  check("HR reads audit logs", au.status === 200 && au.json.data.length > 5 && au.json.data[0].timestamp.length === 19, au.json?.data?.[0]);
  check("audit log has actor + ip from the server", au.json?.data?.every((a: any) => a.actorName && a.ipAddress));
  check("audit shows password reset by super admin", au.json?.data?.some((a: any) => a.action === "Password reset" && a.actorRole === "super_admin"));
  check("audit never stores passwords", !JSON.stringify(au.json).includes(temp) && !JSON.stringify(au.json).includes(NEWPW));
  const auDocs = await hr.call("GET", "/audit-logs?module=Documents");
  check("audit filter by module", auDocs.json?.data?.length >= 3 && auDocs.json.data.every((a: any) => a.targetModule === "Documents"), auDocs.json?.data?.length);
  const p1 = await hr.call("GET", "/audit-logs?limit=2");
  const p2 = await hr.call("GET", `/audit-logs?limit=2&cursor=${p1.json?.nextCursor}`);
  check("audit pagination", !!p1.json?.nextCursor && p2.json?.data?.length === 2 && p1.json.data[0].id !== p2.json.data[0].id, { c: p1.json?.nextCursor });
  check("failed logins are audited", (await hr.call("GET", "/audit-logs?outcome=Failed")).json?.data?.some((a: any) => a.action === "Login failed"));

  // ---------------- Reports
  check("employee cannot read reports -> 403", (await rohit.call("GET", "/reports/headcount")).status === 403);
  const evil = await mkEmp("=SUM(1+1) Csv Test", `csv.${stamp}@graapes.com`);
  const hh = await hr.call("GET", "/reports/headcount");
  const mh = await mgr.call("GET", "/reports/headcount");
  check("HR headcount (company-wide)", hh.status === 200 && hh.json.data.total >= 4 && hh.json.data.byDepartment.length >= 2, hh.json);
  check("manager headcount scoped to own department", mh.status === 200 && mh.json.data.byDepartment.length === 1 && mh.json.data.total < hh.json.data.total, mh.json);
  const csv = await hr.raw("/reports/headcount?format=csv");
  const csvText = csv.buf.toString("utf8");
  check("headcount CSV", csv.status === 200 && csv.type.startsWith("text/csv") && csvText.includes("Employee ID") && csv.disposition.includes("attachment"), csv.type);
  check("CSV neutralises formula injection", csvText.includes("'=SUM(1+1) Csv Test") && !/(^|,)=SUM/m.test(csvText));
  check("CSV has no salary / bank / personal-contact columns", !/salary|bank|ifsc|pan|aadhaar|phone|email/i.test(csvText.split("\r\n")[0]), csvText.split("\r\n")[0]);
  check("attendance report", (await hr.call("GET", "/reports/attendance")).status === 200);
  check("attendance report CSV", (await hr.raw("/reports/attendance?format=csv")).type.startsWith("text/csv"));
  check("attendance report bad range -> 400", (await hr.call("GET", "/reports/attendance?start=2026-12-31&end=2026-01-01")).status === 400);
  const lr = await hr.call("GET", "/reports/leave");
  check("leave report", lr.status === 200 && Array.isArray(lr.json.data.byType), lr.json);
  check("leave report CSV", (await hr.raw("/reports/leave?format=csv")).type.startsWith("text/csv"));
  if (evil.json?.data?.id) await hr.call("PATCH", `/employees/${evil.json.data.id}/deactivate`, {});

  // ---------------- Dashboard
  const dEmp = await rohit.call("GET", "/dashboard");
  check("employee dashboard: personal data only", dEmp.status === 200 && dEmp.json.data.me && dEmp.json.data.team === null && Array.isArray(dEmp.json.data.me.leaveBalances), dEmp.json);
  const dMgr = await mgr.call("GET", "/dashboard"), dHr = await hr.call("GET", "/dashboard"), dSa = await sa.call("GET", "/dashboard");
  check("manager dashboard has team numbers", dMgr.json?.data?.team?.totalEmployees >= 3 && typeof dMgr.json.data.team.pendingApprovals.leave === "number", dMgr.json?.data?.team);
  check("HR/SA dashboards are company-wide", dHr.json?.data?.team?.totalEmployees >= dMgr.json.data.team.totalEmployees && dSa.json?.data?.team?.totalEmployees === dHr.json.data.team.totalEmployees);
  check("dashboard lists upcoming holidays array", Array.isArray(dHr.json?.data?.upcomingHolidays));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("Smoke test crashed:", e); process.exit(1); });
