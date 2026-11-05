import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env, isProd } from "./config/env";
import { prisma } from "./lib/db";
import { errorHandler } from "./middleware/error-handler";
import { originCheck } from "./middleware/origin-check";
import { authRouter } from "./modules/auth/auth.routes";
import { employeeRouter } from "./modules/employees/employee.routes";
import { attendanceRouter } from "./modules/attendance/attendance.routes";
import { leaveRouter } from "./modules/leave/leave.routes";
import { usersRouter, rolesRouter } from "./modules/users/users.routes";
import { holidaysRouter } from "./modules/holidays/holidays.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { announcementsRouter } from "./modules/announcements/announcements.routes";
import { documentsRouter } from "./modules/documents/documents.routes";
import { auditRouter } from "./modules/audit/audit.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { settingsRouter } from "./modules/settings/settings.routes";
import { organizationRouter } from "./modules/organization/organization.routes";

export const app = express();

app.set("trust proxy", env.TRUST_PROXY_HOPS); // 1 = Render only; 2 = Vercel proxy -> Render (so rate limits/audit use the real client IP)
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(originCheck);
app.use("/api", rateLimit({ windowMs: 60_000, limit: env.API_RATE_LIMIT ?? (isProd ? 300 : 5000), standardHeaders: true, legacyHeaders: false })); // blunt abuse protection per IP

app.get("/api/v1/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/employees", employeeRouter);
app.use("/api/v1/attendance", attendanceRouter);
app.use("/api/v1/leave", leaveRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/roles", rolesRouter);
app.use("/api/v1/holidays", holidaysRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/announcements", announcementsRouter);
app.use("/api/v1/documents", documentsRouter);
app.use("/api/v1/audit-logs", auditRouter);
app.use("/api/v1/reports", reportsRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/settings", settingsRouter);
app.use("/api/v1", organizationRouter); // /departments, /designations

app.use((_req, res) => void res.status(404).json({ error: "Not found" }));
app.use(errorHandler);
