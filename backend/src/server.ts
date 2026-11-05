import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/db";

const server = app.listen(env.PORT, () => console.log(`Graapes HRMS API listening on :${env.PORT}`));

// Housekeeping: remove expired sessions every hour.
setInterval(() => {
  prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch((e) => console.error("session cleanup failed", e));
}, 3600_000).unref();

const shutdown = async () => { server.close(); await prisma.$disconnect(); process.exit(0); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
