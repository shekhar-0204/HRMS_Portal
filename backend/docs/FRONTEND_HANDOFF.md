# Frontend hand-off: what is connected, what is left

Already connected in the frontend patch (`frontend-integration.zip`): login/logout/session, employees, departments, designations.

Everything below has a **finished, tested** backend endpoint (see `API.md`). For each page: replace the mock state/action in
`src/context/hrms-context.tsx` with the API call, mirroring how `createEmployee` was done (call API -> update state on success -> toast the server's error message, return a boolean so the page only closes the modal on success).

| Page | Replace with | Watch out for |
|---|---|---|
| `/attendance` | `GET /attendance`, `POST /attendance/check-in`, `/check-out`, corrections endpoints | Remove the fixed 8.5 h and any client-chosen time; the server decides both. `employeeId` query = GRP code |
| `/leave` | `GET /leave/balances?year=`, `GET/POST /leave/requests`, `/cancel`, `/review` | Send `leaveTypeCode`, dates, `isHalfDay`, `reason` only; duration/approver come from the server. Replace `MOCK_LEAVE_BALANCES` |
| `/holidays` | `GET/POST/DELETE /holidays` | Don't send `dayOfWeek`; use the returned one |
| `/documents` | `GET /documents`, multipart `POST /documents`, `/download`, `/verify`, `DELETE` | Use a real `<input type="file">` + `FormData`; download via `fileUrl` with `credentials:"include"` (fetch -> blob) |
| `/announcements` | `GET/POST /announcements` | Field is `expiryDate`; for "Department" audience pick a department (defaults to the author's) |
| Notifications (bell + page) | `GET /notifications`, `PATCH .../read`, `/read-all` | Use `unreadCount` for the badge; poll every ~60 s or on navigation |
| `/dashboard` | `GET /dashboard` | Optional: it returns ready-made numbers (`team.today`, `pendingApprovals`) instead of computing from lists |
| `/reports` | `GET /reports/headcount\|attendance\|leave` (+ `?format=csv`) | CSV: fetch with credentials, then save the blob (a plain `<a href>` also works on the same site) |
| `/users` (Super Admin) | `GET /users`, `POST /users`, `PATCH .../role`, `.../status`, `POST .../reset-password` | Show `temporaryPassword` in a one-time modal ("copy it now") - it is never retrievable again. Replace the hard-coded `usersList` |
| `/roles` | `GET /roles/matrix` | Same row shape as the current hard-coded matrix |
| `/audit` | `GET /audit-logs` | Cursor pagination: pass `nextCursor` back as `cursor` ("Load more") |
| `/settings` | `GET/PATCH /settings/me` | Timezone is fixed; send only `dateFormat` and the two notification booleans |
| `/profile` | `PATCH /employees/:id` (own contact fields) | Employees may only change phone, personal email, address, avatar, emergency contact |
| **New screen needed** | `POST /auth/change-password` | When any call returns 403 + `details.code === "PASSWORD_CHANGE_REQUIRED"` (or `user.mustChangePassword`), route to a change-password page. Also add a "Change password" entry in the profile/settings |

## HR onboarding flow
`POST /employees` is atomic: it creates the employee **and** the linked `employee` login, and returns `temporaryCredentials`
(`email`, `password`, `mustChangePassword`) **once**. Show them in a one-time modal. `POST /users` is only for giving an
*existing* employee a login (or an elevated role, Super Admin only); calling it for a new hire returns 409.
Changing an employee's `workEmail` also updates the login e-mail.

## Small UI gaps found
- Employee create form: add a **Reporting Manager dropdown** (send `reportingManagerId` = employee UUID). The hard-coded "Vikram Malhotra" is ignored by the server.
- Employee form: filter the Designation dropdown by the chosen Department (the server rejects a mismatch with 400).
- Handle `429` (too many login attempts) with a friendly message.

## Behaviour to remember
- UUIDs everywhere for `id`; the human code is `employeeId` (`GRP-014`).
- Server error messages are user-readable; `src/lib/api/client.ts` already turns them into `ApiError.message`.
- Manager "team" filters that compare `reportingManagerId` with `currentUser.employeeId` mix a UUID with a GRP code. Prefer `departmentId` (what the server uses) or compare against the employee's `id`.
