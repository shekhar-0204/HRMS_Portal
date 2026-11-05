import { Prisma } from "@prisma/client";
import { toDateOnly } from "../../lib/dates";

export const employeeInclude = {
  department: true,
  designation: true,
  reportingManager: { select: { fullName: true } },
} satisfies Prisma.EmployeeInclude;

export type EmployeeWithRelations = Prisma.EmployeeGetPayload<{ include: typeof employeeInclude }>;

/** Shape matches the frontend `Employee` type (src/types/index.ts). `id` is the DB uuid, `employeeId` is GRP-xxx. */
export function toEmployeeDto(e: EmployeeWithRelations) {
  return {
    id: e.id,
    employeeId: e.employeeCode,
    fullName: e.fullName,
    workEmail: e.workEmail,
    personalEmail: e.personalEmail ?? undefined,
    phone: e.phone,
    gender: e.gender,
    dateOfBirth: toDateOnly(e.dateOfBirth),
    joiningDate: toDateOnly(e.joiningDate)!,
    employmentType: e.employmentType,
    status: e.status,
    probationEndDate: toDateOnly(e.probationEndDate),
    departmentId: e.departmentId,
    departmentName: e.department.name,
    designationId: e.designationId,
    designationTitle: e.designation.title,
    reportingManagerId: e.reportingManagerId ?? undefined,
    reportingManagerName: e.reportingManager?.fullName,
    workLocation: e.workLocation,
    emergencyContact: { name: e.emergencyName, relationship: e.emergencyRelation, phone: e.emergencyPhone },
    address: e.address,
    avatarUrl: e.avatarUrl ?? undefined,
    exitDetails:
      e.resignationDate || e.lastWorkingDay || e.exitStatus
        ? { resignationDate: toDateOnly(e.resignationDate), lastWorkingDay: toDateOnly(e.lastWorkingDay), exitStatus: e.exitStatus ?? undefined }
        : undefined,
  };
}
