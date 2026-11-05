import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { env } from "../../config/env";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/authorize";
import { can } from "../../lib/permissions";
import { badRequest, forbidden, notFound } from "../../lib/http-error";
import { writeAudit } from "../../lib/audit";
import { dateIST } from "../../lib/time";
import { notifyEmployees } from "../../lib/notify";

export const documentsRouter = Router();
documentsRouter.use(authenticate);

const STORAGE_DIR = path.resolve(env.UPLOAD_DIR);
const CATEGORIES = ["Identification", "Appointment Letter", "Education", "Experience", "Policy Acknowledgement", "Other"] as const;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 10 } });

/** Trust the file's content, never the client-supplied MIME type or extension. */
function detectType(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length > 4 && buf.subarray(0, 4).toString("latin1") === "%PDF") return { ext: "pdf", mime: "application/pdf" };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  return null;
}

const safeName = (n: string, ext: string) => {
  const base = path.basename(n).replace(/\.[^.]*$/, "").replace(/[^\w.\- ]+/g, "_").trim().slice(0, 100) || "document";
  return `${base}.${ext}`;
};
const human = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const include = { employee: { select: { employeeCode: true, fullName: true } } } satisfies Prisma.EmployeeDocumentInclude;
type Doc = Prisma.EmployeeDocumentGetPayload<{ include: typeof include }>;

async function toDtos(rows: Doc[]) {
  const ids = [...new Set(rows.map((r) => r.uploadedById))];
  const people = await prisma.employee.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } });
  const name = new Map(people.map((p) => [p.id, p.fullName]));
  return rows.map((d) => ({
    id: d.id, employeeId: d.employee.employeeCode, employeeName: d.employee.fullName, title: d.title, category: d.category,
    fileName: d.fileName, fileSize: human(d.sizeBytes), uploadedAt: dateIST(d.createdAt),
    uploadedBy: name.get(d.uploadedById) ?? "System", verified: d.verified,
    fileUrl: `/api/v1/documents/${d.id}/download`,
  }));
}

/** Everyone sees only their own documents; HR / Super Admin see the company repository. */
function scope(user: NonNullable<Express.Request["user"]>): Prisma.EmployeeDocumentWhereInput {
  return can(user.role, "documents:read:all") ? {} : { employeeId: user.employeeId ?? "__none__" };
}

async function loadAllowed(id: string, user: NonNullable<Express.Request["user"]>) {
  const d = await prisma.employeeDocument.findFirst({ where: { AND: [{ id }, scope(user)] }, include });
  if (!d) throw notFound("Document not found"); // 404 so other people's document ids are not revealed
  return d;
}

documentsRouter.get("/", async (req, res) => {
  const q = z.object({ employeeId: z.string().regex(/^GRP-\d{3,}$/).optional(), category: z.enum(CATEGORIES).optional() }).parse(req.query);
  const rows = await prisma.employeeDocument.findMany({
    where: { AND: [scope(req.user!), q.employeeId ? { employee: { is: { employeeCode: q.employeeId } } } : {}, q.category ? { category: q.category } : {}] },
    include, orderBy: { createdAt: "desc" },
  });
  res.json({ data: await toDtos(rows) });
});

const metaSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.enum(CATEGORIES),
  employeeId: z.string().regex(/^GRP-\d{3,}$/).optional(),
});

/** multipart/form-data: fields `title`, `category`, optional `employeeId` (HR only), and the file in field `file`. */
documentsRouter.post("/", upload.single("file"), async (req, res) => {
  const user = req.user!;
  if (!req.file) throw badRequest("Attach a file in the `file` field");
  const meta = metaSchema.parse(req.body);
  const type = detectType(req.file.buffer);
  if (!type) throw badRequest("Only PDF, PNG and JPG files are allowed");

  let ownerId = user.employeeId;
  if (meta.employeeId) {
    const target = await prisma.employee.findUnique({ where: { employeeCode: meta.employeeId } });
    if (!target) throw notFound("Employee not found");
    if (target.id !== user.employeeId && !can(user.role, "documents:read:all")) throw forbidden("You can only upload documents to your own profile");
    ownerId = target.id;
  }
  if (!ownerId) throw badRequest("Your account is not linked to an employee record");

  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const storageKey = `${crypto.randomUUID()}.${type.ext}`; // generated by us: no user input in the path
  await fs.writeFile(path.join(STORAGE_DIR, storageKey), req.file.buffer, { flag: "wx" });

  let doc: Doc;
  try {
    doc = await prisma.employeeDocument.create({
      data: {
        employeeId: ownerId, title: meta.title, category: meta.category, fileName: safeName(req.file.originalname, type.ext),
        storageKey, mimeType: type.mime, sizeBytes: req.file.size, uploadedById: user.employeeId ?? ownerId,
      },
      include,
    });
  } catch (e) {
    await fs.unlink(path.join(STORAGE_DIR, storageKey)).catch(() => undefined); // no orphan files if the DB write fails
    throw e;
  }
  await writeAudit({ req, action: "Document uploaded", module: "Documents", recordId: doc.id, description: `Uploaded "${doc.title}" (${doc.category}) for ${doc.employee.employeeCode}` });
  res.status(201).json({ data: (await toDtos([doc]))[0] });
});

documentsRouter.get("/:id/download", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const d = await loadAllowed(id, req.user!);
  const abs = path.join(STORAGE_DIR, d.storageKey);
  if (!abs.startsWith(STORAGE_DIR + path.sep)) throw forbidden();
  await fs.access(abs).catch(() => { throw notFound("File is missing from storage"); });
  await writeAudit({ req, action: "Document downloaded", module: "Documents", recordId: id, description: `Downloaded "${d.title}" of ${d.employee.employeeCode}` });
  res.type(d.mimeType);
  res.download(abs, d.fileName);
});

documentsRouter.patch("/:id/verify", requirePermission("documents:read:all"), async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { verified } = z.object({ verified: z.boolean() }).parse(req.body);
  const d = await loadAllowed(id, req.user!);
  const updated = await prisma.employeeDocument.update({ where: { id }, data: { verified }, include });
  if (verified) await notifyEmployees([d.employeeId], { title: "Document verified", message: `Your document "${d.title}" has been verified by HR.`, category: "Profile", link: "/documents" });
  await writeAudit({ req, action: verified ? "Document verified" : "Document unverified", module: "Documents", recordId: id, description: `${verified ? "Verified" : "Unverified"} "${d.title}" of ${d.employee.employeeCode}` });
  res.json({ data: (await toDtos([updated]))[0] });
});

/** Owners may delete their own unverified documents; HR / Super Admin may delete any. */
documentsRouter.delete("/:id", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const user = req.user!;
  const d = await loadAllowed(id, user);
  if (!can(user.role, "documents:read:all") && d.verified) throw forbidden("Verified documents can only be removed by HR");
  await prisma.employeeDocument.delete({ where: { id } });
  await fs.unlink(path.join(STORAGE_DIR, d.storageKey)).catch(() => undefined);
  await writeAudit({ req, action: "Document deleted", module: "Documents", recordId: id, description: `Deleted "${d.title}" of ${d.employee.employeeCode}` });
  res.status(204).end();
});
