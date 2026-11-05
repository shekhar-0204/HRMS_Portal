import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        employeeId: string | null; // Employee.id (uuid)
        departmentId: string | null;
        sessionId: string;
        mustChangePassword: boolean;
      };
    }
  }
}
export {};
