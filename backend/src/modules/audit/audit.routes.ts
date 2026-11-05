import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/authorize";
import { fmtTimestamp, istToUtc } from "../../lib/time";

export const auditRouter = Router();
auditRouter.use(authenticate, requirePermission("audit:read"));

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Read-only by design: there is no endpoint to edit or delete audit rows. */
auditRouter.get("/", async (req, res) => {
  const q = z.object({
    module: z.string().max(30).optional(),
    outcome: z.enum(["Success", "Failed", "Warning"]).optional(),
    search: z.string().trim().max(100).optional(),
    start: dateOnly.optional(), end: dateOnly.optional(),
    limit: z.coerce.number().int().min(1).max(500).default(200),
    cursor: z.string().uuid().optional(),
  }).parse(req.query);

  const where: Prisma.AuditLogWhereInput = {
    ...(q.module ? { targetModule: q.module } : {}),
    ...(q.outcome ? { outcome: q.outcome } : {}),
    ...(q.start || q.end ? { createdAt: { ...(q.start ? { gte: istToUtc(q.start, { h: 0, m: 0 }) } : {}), ...(q.end ? { lte: istToUtc(q.end, { h: 23, m: 59 }) } : {}) } } : {}),
    ...(q.search ? { OR: [
      { description: { contains: q.search, mode: "insensitive" } },
      { actorName: { contains: q.search, mode: "insensitive" } },
      { action: { contains: q.search, mode: "insensitive" } },
    ] } : {}),
  };
  const rows = await prisma.auditLog.findMany({
    where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, q.limit);
  res.json({
    nextCursor: rows.length > q.limit ? page[page.length - 1].id : null,
    data: page.map((a) => ({
      id: a.id, timestamp: fmtTimestamp(a.createdAt), actorName: a.actorName, actorRole: a.actorRole, action: a.action,
      targetModule: a.targetModule, targetRecordId: a.targetRecordId ?? undefined, description: a.description,
      ipAddress: a.ipAddress, outcome: a.outcome,
    })),
  });
});
