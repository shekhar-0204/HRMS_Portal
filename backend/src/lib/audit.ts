import type { Request } from "express";
import { prisma } from "./db";

type Module = "Auth" | "Employees" | "Leave" | "Attendance" | "Organization" | "Documents" | "Settings" | "Users";

interface AuditInput {
  req: Request;
  action: string;
  module: Module;
  description: string;
  recordId?: string;
  outcome?: "Success" | "Failed" | "Warning";
  /** For events before a session exists (e.g. failed login). */
  actorOverride?: { name: string; role: string };
}

/** Actor, role and IP are always derived on the server, never taken from the request body. */
export async function writeAudit(i: AuditInput): Promise<void> {
  const user = i.req.user;
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: user?.id,
        actorName: i.actorOverride?.name ?? user?.name ?? "Anonymous",
        actorRole: i.actorOverride?.role ?? user?.role ?? "none",
        action: i.action,
        targetModule: i.module,
        targetRecordId: i.recordId,
        description: i.description,
        ipAddress: i.req.ip ?? "unknown",
        outcome: i.outcome ?? "Success",
      },
    });
  } catch (e) {
    console.error("audit write failed", e);
  }
}
