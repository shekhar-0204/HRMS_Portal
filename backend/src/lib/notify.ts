import { prisma } from "./db";

interface Payload { title: string; message: string; category: "Leave" | "Attendance" | "Announcement" | "Profile" | "System"; link?: string }

/** Creates in-app notifications, skipping users who switched in-app notifications off in Settings. */
export async function notifyUsers(userIds: string[], n: Payload): Promise<void> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  const optedOut = await prisma.userPreference.findMany({ where: { userId: { in: ids }, inAppNotifications: false }, select: { userId: true } });
  const skip = new Set(optedOut.map((p) => p.userId));
  const targets = ids.filter((id) => !skip.has(id));
  if (!targets.length) return;
  await prisma.notification.createMany({ data: targets.map((recipientId) => ({ recipientId, ...n })) });
}

export async function notifyEmployees(employeeIds: string[], n: Payload): Promise<void> {
  const users = await prisma.user.findMany({ where: { employeeId: { in: employeeIds }, isActive: true }, select: { id: true } });
  await notifyUsers(users.map((u) => u.id), n);
}

export async function notifyHrAdmins(n: Payload): Promise<void> {
  const users = await prisma.user.findMany({ where: { role: "hr_admin", isActive: true }, select: { id: true } });
  await notifyUsers(users.map((u) => u.id), n);
}
