import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/authorize";
import { badRequest, notFound } from "../../lib/http-error";
import { writeAudit } from "../../lib/audit";
import { dayName, todayIST } from "../../lib/time";
import { fromDateOnly, toDateOnly } from "../../lib/dates";

export const holidaysRouter = Router();
holidaysRouter.use(authenticate);

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const toDto = (h: { id: string; name: string; date: Date; type: string; isOptional: boolean }) => ({
  id: h.id, name: h.name, date: toDateOnly(h.date)!, dayOfWeek: dayName(toDateOnly(h.date)!), type: h.type, isOptional: h.isOptional,
});

holidaysRouter.get("/", async (req, res) => {
  const { year } = z.object({ year: z.coerce.number().int().min(2000).max(2100).optional() }).parse(req.query);
  const rows = await prisma.holiday.findMany({
    where: year ? { date: { gte: fromDateOnly(`${year}-01-01`)!, lte: fromDateOnly(`${year}-12-31`)! } } : {},
    orderBy: { date: "asc" },
  });
  res.json({ data: rows.map(toDto) });
});

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  date: dateOnly,
  type: z.enum(["National Holiday", "Restricted Holiday", "Company Festival"]),
  isOptional: z.boolean().optional(),
});

holidaysRouter.post("/", requirePermission("holidays:write"), async (req, res) => {
  const b = createSchema.parse(req.body);
  const year = Number(b.date.slice(0, 4)), thisYear = Number(todayIST().slice(0, 4));
  if (Math.abs(year - thisYear) > 2) throw badRequest("Holiday date must be within two years of today");
  const h = await prisma.holiday.create({
    data: { name: b.name, date: fromDateOnly(b.date)!, type: b.type, isOptional: b.isOptional ?? b.type === "Restricted Holiday" },
  }); // duplicate (date + name) -> 409 via the unique constraint
  await writeAudit({ req, action: "Holiday added", module: "Settings", recordId: h.id, description: `Added holiday ${h.name} on ${b.date}` });
  res.status(201).json({ data: toDto(h) });
});

holidaysRouter.delete("/:id", requirePermission("holidays:write"), async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const h = await prisma.holiday.findUnique({ where: { id } });
  if (!h) throw notFound("Holiday not found");
  await prisma.holiday.delete({ where: { id } });
  await writeAudit({ req, action: "Holiday deleted", module: "Settings", recordId: id, description: `Deleted holiday ${h.name} (${toDateOnly(h.date)})` });
  res.status(204).end();
});
