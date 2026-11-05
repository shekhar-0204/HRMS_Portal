import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { env, isProd } from "../../config/env";

// Strict in production; relaxed in development so test scripts can sign in repeatedly. Override with LOGIN_RATE_LIMIT.
const AUTH_LIMIT = env.LOGIN_RATE_LIMIT ?? (isProd ? 10 : 200);
import { writeAudit } from "../../lib/audit";
import { unauthorized } from "../../lib/http-error";
import { authenticateAllowPasswordChange as authenticate, hashToken, SESSION_COOKIE } from "../../middleware/authenticate";
import { badRequest } from "../../lib/http-error";
import { passwordSchema } from "../../lib/password";

export const authRouter = Router();

// skipSuccessfulRequests: only FAILED attempts count, so a whole office behind one IP is not locked out at 9:30 AM.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: AUTH_LIMIT, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true });
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12); // equalises timing for unknown emails

const loginSchema = z.object({ email: z.string().email().toLowerCase(), password: z.string().min(1).max(200) });

authRouter.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email }, include: { employee: true } });

  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.isActive) {
    await writeAudit({
      req, action: "Login failed", module: "Auth", outcome: "Failed",
      description: `Failed sign-in attempt for ${email}`,
      actorOverride: { name: email, role: user?.role ?? "unknown" },
    });
    throw unauthorized("Invalid credentials"); // same message for wrong password, unknown email, inactive
  }

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.$transaction([
    prisma.session.create({
      data: {
        tokenHash: hashToken(token), userId: user.id,
        expiresAt: new Date(Date.now() + env.SESSION_TTL_HOURS * 3600_000),
        ipAddress: req.ip, userAgent: req.get("user-agent")?.slice(0, 255),
      },
    }),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
  ]);

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true, secure: isProd, sameSite: "lax", path: "/",
    maxAge: env.SESSION_TTL_HOURS * 3600_000,
  });

  req.user = { id: user.id, email: user.email, name: user.employee?.fullName ?? user.email, role: user.role,
    employeeId: user.employeeId, departmentId: user.employee?.departmentId ?? null, sessionId: "", mustChangePassword: user.mustChangePassword };
  await writeAudit({ req, action: "Login", module: "Auth", description: `${user.email} signed in` });

  res.json({ user: await toSessionUser(user.id) });
});

authRouter.post("/logout", authenticate, async (req, res) => {
  await prisma.session.delete({ where: { id: req.user!.sessionId } }).catch(() => undefined);
  await writeAudit({ req, action: "Logout", module: "Auth", description: `${req.user!.email} signed out` });
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.status(204).end();
});

authRouter.get("/me", authenticate, async (req, res) => {
  res.json({ user: await toSessionUser(req.user!.id) });
});

const changeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: AUTH_LIMIT, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true });
const changeSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: passwordSchema });

/** Works for a normal change and for the forced change after a temporary password. Other sessions are revoked. */
authRouter.post("/change-password", changeLimiter, authenticate, async (req, res) => {
  const { currentPassword, newPassword } = changeSchema.parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    await writeAudit({ req, action: "Password change failed", module: "Auth", outcome: "Failed", description: `Wrong current password for ${user.email}` });
    throw badRequest("Current password is incorrect");
  }
  if (currentPassword === newPassword) throw badRequest("New password must be different from the current password");
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12), mustChangePassword: false } }),
    prisma.session.deleteMany({ where: { userId: user.id, id: { not: req.user!.sessionId } } }),
  ]);
  await writeAudit({ req, action: "Password changed", module: "Auth", description: `${user.email} changed their password` });
  res.json({ success: true });
});

/** Shape matches the frontend `User` type in src/types/index.ts. */
async function toSessionUser(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { employee: { include: { designation: true } } },
  });
  return {
    id: u.id,
    email: u.email,
    name: u.employee?.fullName ?? u.email,
    role: u.role,
    avatarUrl: u.employee?.avatarUrl ?? undefined,
    departmentId: u.employee?.departmentId,
    employeeId: u.employee?.employeeCode,
    designation: u.employee?.designation.title,
    mustChangePassword: u.mustChangePassword,
  };
}
