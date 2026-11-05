# Graapes HRMS Backend

Node.js + Express 5 + TypeScript + Prisma + PostgreSQL. Cookie-session auth with server-side roles.
All 14 planned modules are implemented and tested (51 endpoints). See `docs/API.md` and `docs/FRONTEND_HANDOFF.md`.

## First-time setup
1. PostgreSQL running; create the database: `CREATE DATABASE graapes_hr;`
2. `cp .env.example .env` and set `DATABASE_URL` (URL-encode special characters in the password) and `FRONTEND_ORIGIN` (exactly the frontend URL, no trailing slash).
3. `npm install`
4. `npx prisma migrate deploy`   (applies every migration in `prisma/migrations`)
5. `npm run seed`               (departments, designations, leave types, 4 demo accounts)
6. `npm run dev`                -> http://localhost:4000/api/v1/health

> **Migrations**: the `prisma/migrations` folder must be committed to git and shared. It is the source of truth for the database structure.
> After changing `schema.prisma` run `npx prisma migrate dev --name <what_changed>` and commit the new folder.

Seeded logins (password = `SEED_DEFAULT_PASSWORD` in `.env`): `superadmin@graapes.com`, `hr.admin@graapes.com`, `manager.eng@graapes.com`, `rohit.mehta@graapes.com`.
**Change these passwords and never use the seed on a production database.**

## Tests
Start the server, then in a second terminal: `npm run smoke:all` (151 checks: auth, permissions, employees, attendance, leave, users,
password lifecycle, holidays, notifications, announcements, documents, audit, reports, dashboard, settings).
They create throw-away records and are meant for a **development** database only.

## Scripts
`dev` · `build` + `start` (production) · `typecheck` · `seed` · `smoke`, `smoke:2`, `smoke:all` · `prisma:migrate`, `prisma:deploy`

## Configuration (`.env`)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `FRONTEND_ORIGIN` | Allowed browser origin (CORS + CSRF check) |
| `SESSION_TTL_HOURS` | Session lifetime (default 12) |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | Document storage folder (outside any web root) and size limit |
| `LOGIN_RATE_LIMIT`, `API_RATE_LIMIT` | Optional overrides. Defaults: production 10 logins/15 min and 300 calls/min per IP; development is relaxed |
| `NODE_ENV` | `production` turns on `Secure` cookies (needs HTTPS) and the strict rate limits |

## Business rules assumed (confirm with the BRD; `src/lib/attendance-rules.ts`)
Late = check-in after 09:45 IST · under 4 h worked = Half-Day · corrections allowed for the last 30 days · managers act on their whole department ·
leave cannot span two calendar years, backdating limited to 30 days · approved leave marks working days as `Leave` on attendance ·
HR can create `employee`-role logins for new hires; every other account action (roles, activate/deactivate, password reset, elevated-role logins) is Super Admin only (matrix in `src/lib/permissions.ts`).

## Known deployment notes
- Session cookie is `SameSite=Lax`: serve frontend and API from the same site (e.g. `app.example.com` + `api.example.com`) or behind one reverse proxy.
- The global limit is per IP (default 300 calls/min in production). Offices sharing one IP may need a higher `API_RATE_LIMIT`.
- Seeded demo accounts do not force a password change; change them or do not seed in production.

## Not in scope / needs a decision
- **Email delivery**: the "email notifications" preference is stored but no emails are sent (needs an SMTP provider).
- **Payroll / compensation**: excluded in Phase 1 (also absent from all exports).
- **Absent days**: days with no punch have no row; reports count recorded days only.
- **Holiday added after a leave was approved** does not recompute that leave's duration.

## Production checklist
HTTPS in front (reverse proxy) + `NODE_ENV=production` · strong unique `DATABASE_URL` credentials · back up PostgreSQL **and** `UPLOAD_DIR` ·
do not run the seed · run `npm run build && npm start` under a process manager · set `FRONTEND_ORIGIN` to the real https origin ·
when moving to Prisma 7, move the `prisma.seed` setting from `package.json` to `prisma.config.ts`.
