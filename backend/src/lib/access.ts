import type { Prisma } from "@prisma/client";
import { can } from "./permissions";

type AuthUser = NonNullable<Express.Request["user"]>;

/** Row-level read scope: admins see all, managers their department, employees only themselves. */
export function employeeScope(user: AuthUser): Prisma.EmployeeWhereInput {
  if (can(user.role, "employees:read:all")) return {};
  if (can(user.role, "employees:read:team") && user.departmentId) return { departmentId: user.departmentId };
  return { id: user.employeeId ?? "__none__" };
}

/** Who may approve/reject a request raised by `target`. Self-approval is never allowed (BR-005). */
export function canReviewFor(user: AuthUser, target: { id: string; departmentId: string }): boolean {
  if (user.employeeId && user.employeeId === target.id) return false;
  if (can(user.role, "employees:read:all")) return true; // super_admin, hr_admin
  return user.role === "department_manager" && user.departmentId === target.departmentId;
}
