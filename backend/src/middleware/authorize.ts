import type { RequestHandler } from "express";
import { can, Permission } from "../lib/permissions";
import { forbidden, unauthorized } from "../lib/http-error";

export const requirePermission =
  (...perms: Permission[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw unauthorized();
    if (!perms.some((p) => can(req.user!.role, p))) throw forbidden();
    next();
  };
