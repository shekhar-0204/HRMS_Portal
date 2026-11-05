import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { HttpError } from "../lib/http-error";
import { isProd } from "../config/env";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) return void res.status(err.status).json({ error: err.message, details: err.details });
  if (err instanceof ZodError) return void res.status(400).json({ error: "Validation failed", details: err.flatten().fieldErrors });
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
    return void res.status(409).json({ error: "A record with the same unique value already exists" });
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025")
    return void res.status(404).json({ error: "Resource not found" });
  // body-parser / http-errors: malformed JSON (400), payload too large (413), unsupported charset etc.
  if (err?.type === "entity.parse.failed") return void res.status(400).json({ error: "Malformed JSON in request body" });
  if (err?.type === "entity.too.large") return void res.status(413).json({ error: "Request body is too large" });
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500 && err?.expose)
    return void res.status(err.status).json({ error: err.message });
  if (err?.name === "MulterError")
    return void res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "File is too large" : `Upload error: ${err.message}` });
  console.error(err);
  res.status(500).json({ error: "Internal server error", ...(isProd ? {} : { detail: String(err) }) });
};
