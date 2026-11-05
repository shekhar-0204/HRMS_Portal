import type { RequestHandler } from "express";
import crypto from "crypto";
import { prisma } from "../lib/db";
import { HttpError, unauthorized } from "../lib/http-error";

export const SESSION_COOKIE = "graapes_sid";
export const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

function build(allowPasswordChangePending: boolean): RequestHandler {
  return async (req, _res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw unauthorized();

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { include: { employee: true } } },
    });
    if (!session || session.expiresAt < new Date()) throw unauthorized("Session expired");
    if (!session.user.isActive) throw unauthorized("Account is deactivated");

    const u = session.user;
    req.user = {
      id: u.id, email: u.email, name: u.employee?.fullName ?? u.email, role: u.role,
      employeeId: u.employeeId, departmentId: u.employee?.departmentId ?? null,
      sessionId: session.id, mustChangePassword: u.mustChangePassword,
    };
    if (u.mustChangePassword && !allowPasswordChangePending)
      throw new HttpError(403, "You must change your temporary password before continuing", { code: "PASSWORD_CHANGE_REQUIRED" });
    next();
  };
}

/** Standard guard: signed-in AND not stuck on a temporary password. */
export const authenticate = build(false);
/** Only for /auth/me, /auth/logout and /auth/change-password. */
export const authenticateAllowPasswordChange = build(true);
