# Graapes HRMS API (v1)

Base URL: `http://localhost:4000/api/v1`  ·  JSON in/out  ·  51 endpoints

## Conventions
- **Auth**: HttpOnly cookie `graapes_sid`, set by `POST /auth/login`. Browser calls must use `credentials: "include"`.
  `FRONTEND_ORIGIN` in the backend `.env` must equal the frontend origin exactly (CORS + CSRF origin check).
- **Success**: `{ "data": ... }` (lists: `data` is an array). Extras sit next to `data` (e.g. `unreadCount`, `nextCursor`, `temporaryPassword`).
- **Errors**: `{ "error": "message", "details": ... }`.
  `400` validation (`details` = field -> messages) · `401` not signed in / bad credentials · `403` not allowed · `404` not found
  (also used when a record exists but is outside your scope) · `409` conflict (duplicate, already processed) · `413` file too large · `429` rate limited.
- **Temporary password**: when `user.mustChangePassword` is true every endpoint except `/auth/me`, `/auth/logout` and
  `/auth/change-password` returns `403` with `details.code === "PASSWORD_CHANGE_REQUIRED"`. Send the user to a change-password screen.
- **Dates/times** (business timezone Asia/Kolkata): date-only `YYYY-MM-DD`; clock times `"09:28 AM"`; timestamps `"2026-10-24 10:15 AM"`;
  audit timestamps `"2026-10-24 10:15:32"`. Request clock times accept `"09:30 AM"` or `"18:35"`.
- **IDs**: records use UUIDs (`id`). Employees also have a human code `employeeId` = `GRP-014`. Where an API takes/returns `employeeId`
  in attendance, leave, documents and reports it is the **GRP code**; for `/employees/:id` and `departmentId`/`designationId`/`reportingManagerId` it is the **UUID**.
- **Never trusted from the client**: acting employee, reviewer, actor name/role/IP, check-in/out times, leave duration, work hours.

## Roles
`super_admin` · `hr_admin` · `department_manager` · `employee`. Live matrix: `GET /roles/matrix`.
"Scope": employee = self · manager = own department · HR / Super Admin = everyone.

## Endpoints
| Method & path | Who | Notes |
|---|---|---|
| **Auth** | | |
| `POST /auth/login` | public | `{email,password}` -> `{user}`; sets cookie. 401 for wrong password, unknown email and inactive account alike |
| `POST /auth/logout` | signed in | 204 |
| `GET /auth/me` | signed in | `{user}` (incl. `mustChangePassword`) |
| `POST /auth/change-password` | signed in | `{currentPassword,newPassword}`; policy: >=10 chars, upper+lower+digit; signs out other sessions |
| **Employees** | | |
| `GET /employees` | scope | `?departmentId&status&search` |
| `GET /employees/:id` | scope | 404 outside scope |
| `POST /employees` | HR, SA | `employeeId` optional (server assigns next `GRP-xxx`); duplicate email/ID -> 409 |
| `PATCH /employees/:id` | HR/SA any field; employee: own contact fields only | `status:"Inactive"` is rejected - use deactivate |
| `PATCH /employees/:id/deactivate` | HR, SA | `{reason?}`; disables login, keeps history; cannot deactivate yourself |
| **Organization** | | |
| `GET /departments`, `GET /designations` | signed in | |
| `POST /departments`, `POST /designations` | HR, SA | |
| **Attendance** | | |
| `GET /attendance` | scope | `?employeeId=GRP-014&start&end` (default last 30 days) |
| `POST /attendance/check-in`, `POST /attendance/check-out` | self | server clock; duration computed server-side; late after 09:45 IST; <4h = Half-Day |
| `GET /attendance/corrections` | scope | `?status` |
| `POST /attendance/corrections` | self | `{date,requestedCheckIn,requestedCheckOut,reason}`; last 30 days only; one pending per date |
| `PATCH /attendance/corrections/:id/review` | HR, SA, manager (own dept) | `{decision:"Approved"\|"Rejected",notes?}`; reason required on reject; no self-review |
| **Leave** | | |
| `GET /leave/balances` | self (`?employeeId` within scope) | `?year=` (previous/current/next) |
| `GET /leave/requests` | scope | `?employeeId&status` |
| `POST /leave/requests` | self | `{leaveTypeCode,startDate,endDate,isHalfDay?,reason}`; duration = working days (weekends + holidays excluded); balance reserved atomically |
| `POST /leave/requests/:id/cancel` | owner | pending only |
| `PATCH /leave/requests/:id/review` | HR, SA, manager (own dept) | `{decision,notes?}`; approval marks the days as `Leave` on the attendance register |
| **Holidays** | | |
| `GET /holidays` | signed in | `?year=` |
| `POST /holidays`, `DELETE /holidays/:id` | HR, SA | `{name,date,type,isOptional?}`; `dayOfWeek` computed |
| **Documents** | | |
| `GET /documents` | own; HR/SA all | `?employeeId&category` |
| `POST /documents` | signed in | **multipart/form-data**: `title`, `category`, optional `employeeId` (HR/SA only), file in `file`. PDF/PNG/JPG, max `MAX_UPLOAD_MB` (default 5); type checked by content |
| `GET /documents/:id/download` | owner, HR, SA | attachment; audited |
| `PATCH /documents/:id/verify` | HR, SA | `{verified:boolean}` |
| `DELETE /documents/:id` | owner (unverified) or HR/SA | 204 |
| **Communication** | | |
| `GET /announcements` | signed in | audience-filtered, expired hidden (`?includeExpired=true` for HR/SA) |
| `POST /announcements` | HR, SA | `{title,content,category,priority,targetAudience,targetDepartmentId?,expiryDate?}`; notifies the audience |
| `GET /notifications` | self | `?unread=true&limit` -> `{data, unreadCount}` |
| `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` | self | |
| **Users & roles** | | |
| `GET /roles/matrix` | signed in | rows for the Roles page |
| `GET /users` | SA | HR cannot list users, change roles, deactivate accounts or reset passwords |
| `POST /users` | SA (any role) · HR (role `employee` only) | `{employeeId:"GRP-014",role,email?,temporaryPassword?}` -> `{data,temporaryPassword}` (**shown once**). HR asking for any other role -> 403 |
| `PATCH /users/:id/role`, `PATCH /users/:id/status` | SA | cannot change self; last active Super Admin is protected; deactivation signs the user out |
| `POST /users/:id/reset-password` | SA | -> `{temporaryPassword}` (shown once) |
| **Insights** | | |
| `GET /dashboard` | signed in | `{me, team (HR/SA/manager only), unreadNotifications, upcomingHolidays}` |
| `GET /reports/headcount`, `/reports/attendance`, `/reports/leave` | HR, SA, manager (own dept) | add `?format=csv` to download. Attendance: `?start&end&departmentId`; leave: `?year`. CSVs contain no salary/bank/contact data |
| `GET /audit-logs` | HR, SA | `?module&outcome&search&start&end&limit&cursor` -> `{data, nextCursor}`; read-only |
| `GET /settings/me`, `PATCH /settings/me` | self | `{dateFormat, emailNotifications, inAppNotifications}`; timezone fixed to Asia/Kolkata |
| `GET /health` | public | |
