import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { authenticate } from "../../middleware/authenticate";
import { notFound } from "../../lib/http-error";
import { fmtDateTime } from "../../lib/time";

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

/** Always scoped to the signed-in user: nobody can read or mark another user's notifications. */
notificationsRouter.get("/", async (req, res) => {
  const q = z.object({ unread: z.enum(["true", "false"]).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(req.query);
  const where = { recipientId: req.user!.id, ...(q.unread === "true" ? { read: false } : {}) };
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: q.limit }),
    prisma.notification.count({ where: { recipientId: req.user!.id, read: false } }),
  ]);
  res.json({
    unreadCount,
    data: rows.map((n) => ({
      id: n.id, recipientId: n.recipientId, title: n.title, message: n.message, category: n.category,
      link: n.link ?? undefined, read: n.read, createdAt: fmtDateTime(n.createdAt)!,
    })),
  });
});

notificationsRouter.patch("/read-all", async (req, res) => {
  const r = await prisma.notification.updateMany({ where: { recipientId: req.user!.id, read: false }, data: { read: true } });
  res.json({ success: true, updated: r.count });
});

notificationsRouter.patch("/:id/read", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const r = await prisma.notification.updateMany({ where: { id, recipientId: req.user!.id }, data: { read: true } });
  if (r.count === 0) throw notFound("Notification not found");
  res.json({ success: true });
});
