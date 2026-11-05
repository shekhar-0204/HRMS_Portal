import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const emergency = z.object({
  name: z.string().trim().max(120).default(""),
  relationship: z.string().trim().max(60).default(""),
  phone: z.string().trim().max(20).default(""),
});

const baseEmployeeSchema = z.object({
  employeeId: z.string().regex(/^GRP-\d{3,}$/, "Employee ID must look like GRP-014").optional(),
  fullName: z.string().trim().min(2).max(120),
  workEmail: z.string().trim().toLowerCase().email(),
  personalEmail: z.string().trim().toLowerCase().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().min(7).max(20),
  gender: z.enum(["Male", "Female", "Other"]),
  dateOfBirth: dateOnly.optional(),
  joiningDate: dateOnly,
  employmentType: z.enum(["Full-Time", "Part-Time", "Intern", "Contract"]),
  status: z.enum(["Active", "Probation", "Notice Period", "Inactive"]).default("Active"),
  probationEndDate: dateOnly.optional(),
  departmentId: z.string().uuid(),
  designationId: z.string().uuid(),
  reportingManagerId: z.string().uuid().optional(),
  workLocation: z.string().trim().min(1).max(120),
  emergencyContact: emergency.default({ name: "", relationship: "", phone: "" }),
  address: z.string().trim().max(500).default(""),
  avatarUrl: z.string().url().optional(),
});

/** New hires cannot be created as "Inactive" (that would still provision an active login). */
export const createEmployeeSchema = baseEmployeeSchema.refine((b) => b.status !== "Inactive", { message: "A new employee cannot be created as Inactive", path: ["status"] });

export const updateEmployeeSchema = baseEmployeeSchema
  .omit({ employeeId: true })
  .partial()
  .extend({ emergencyContact: emergency.partial().optional() })
  .strict();

/** BR-003: employees may only edit contact details on their own profile. */
export const selfUpdateSchema = z
  .object({
    phone: z.string().trim().min(7).max(20),
    personalEmail: z.string().trim().toLowerCase().email(),
    address: z.string().trim().max(500),
    avatarUrl: z.string().url(),
    emergencyContact: emergency.partial(),
  })
  .partial()
  .strict();

export const listQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  status: z.enum(["Active", "Probation", "Notice Period", "Inactive"]).optional(),
  search: z.string().trim().max(100).optional(),
});

export const deactivateSchema = z.object({ reason: z.string().trim().max(500).optional() });
