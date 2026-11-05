import type { UserRole } from "@prisma/client";

const ADMINS = ["super_admin", "hr_admin"] as const;
const REVIEWERS = ["super_admin", "hr_admin", "department_manager"] as const;

/** Server-side permission matrix. The frontend menu hiding is cosmetic; this is the authority. */
export const PERMISSIONS = {
  "employees:read:all": ADMINS,
  "employees:read:team": ["department_manager"],
  "employees:write": ADMINS,
  "organization:write": ADMINS,
  "attendance:review": REVIEWERS,
  "leave:review": REVIEWERS,
  "holidays:write": ADMINS,
  "documents:read:all": ADMINS,
  "announcements:write": ADMINS,
  "reports:read": REVIEWERS,
  "users:manage": ["super_admin"],
  "users:provision": ADMINS, // create a login for a new hire (HR: employee role only)
  "audit:read": ADMINS,
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export const can = (role: UserRole, permission: Permission): boolean =>
  (PERMISSIONS[permission] as readonly UserRole[]).includes(role);

const ALL: readonly UserRole[] = ["super_admin", "hr_admin", "department_manager", "employee"];

/** Rows shown on the Roles page. Built from the same PERMISSIONS map so the page and the enforcement cannot drift. */
export const ROLE_MATRIX: { module: string; roles: readonly UserRole[] }[] = [
  { module: "Employee Profiles (View Own)", roles: ALL },
  { module: "Employee Profiles (View Directory)", roles: [...PERMISSIONS["employees:read:all"], ...PERMISSIONS["employees:read:team"]] },
  { module: "Employee Profiles (Create/Edit)", roles: PERMISSIONS["employees:write"] },
  { module: "Employee Deactivation", roles: PERMISSIONS["employees:write"] },
  { module: "Department & Designations Setup", roles: PERMISSIONS["organization:write"] },
  { module: "Attendance Check-in / Punch", roles: ALL },
  { module: "Attendance Corrections (Submit)", roles: ALL },
  { module: "Attendance Corrections (Approve)", roles: PERMISSIONS["attendance:review"] },
  { module: "Leave Application (Submit)", roles: ALL },
  { module: "Leave Approval (Team / Company)", roles: PERMISSIONS["leave:review"] },
  { module: "Holiday Calendar Management", roles: PERMISSIONS["holidays:write"] },
  { module: "Documents Upload & View Own", roles: ALL },
  { module: "Documents View Company Repository", roles: PERMISSIONS["documents:read:all"] },
  { module: "Publish Announcements", roles: PERMISSIONS["announcements:write"] },
  { module: "Operational & Export Reports", roles: PERMISSIONS["reports:read"] },
  { module: "Login Account Creation (New Hires)", roles: PERMISSIONS["users:provision"] },
  { module: "User & Role Administration", roles: PERMISSIONS["users:manage"] },
  { module: "Audit Log Trace Review", roles: PERMISSIONS["audit:read"] },
  { module: "Payroll & Compensation (Conditional)", roles: [] }, // out of Phase 1 scope
];
