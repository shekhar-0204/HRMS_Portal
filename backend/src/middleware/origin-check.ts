import type { RequestHandler } from "express";
import { env } from "../config/env";
import { forbidden } from "../lib/http-error";

/** CSRF defence in depth (on top of SameSite cookies): reject cross-origin state-changing requests. */
export const originCheck: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin && origin !== env.FRONTEND_ORIGIN) throw forbidden("Cross-origin request blocked");
  next();
};
