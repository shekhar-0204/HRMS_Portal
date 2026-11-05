import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { authenticate } from "../../middleware/authenticate";
import { writeAudit } from "../../lib/audit";

export const settingsRouter = Router();
settingsRouter.use(authenticate);

const toDto = (p: { timezone: string; dateFormat: string; emailNotifications: boolean; inAppNotifications: boolean }) => ({
  timezone: p.timezone, dateFormat: p.dateFormat, emailNotifications: p.emailNotifications, inAppNotifications: p.inAppNotifications,
});

settingsRouter.get("/me", async (req, res) => {
  const p = await prisma.userPreference.upsert({ where: { userId: req.user!.id }, update: {}, create: { userId: req.user!.id } });
  res.json({ data: toDto(p) });
});

const patchSchema = z.object({
  timezone: z.literal("Asia/Kolkata"), // business timezone is fixed (BR-009)
  dateFormat: z.enum(["DD/MM/YYYY", "DD-MMM-YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]),
  emailNotifications: z.boolean(),
  inAppNotifications: z.boolean(),
}).partial().strict();

settingsRouter.patch("/me", async (req, res) => {
  const b = patchSchema.parse(req.body);
  const p = await prisma.userPreference.upsert({ where: { userId: req.user!.id }, update: b, create: { userId: req.user!.id, ...b } });
  await writeAudit({ req, action: "Preferences updated", module: "Settings", description: `${req.user!.email} updated: ${Object.keys(b).join(", ") || "nothing"}` });
  res.json({ data: toDto(p) });
});
