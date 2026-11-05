import {
  Employee,
  AttendanceRecord,
  AttendanceCorrectionRequest,
  LeaveRequest,
  LeaveBalance,
  Department,
  Designation,
  EmployeeDocument,
  AuditEvent,
} from "@/types";

/**
 * Enterprise API Adapter Interfaces
 * Clean, strongly-typed contracts ready to be connected to the backend developer's REST / GraphQL endpoints.
 */

export interface IEmployeeService {
  getEmployees(params?: { departmentId?: string; status?: string; search?: string }): Promise<Employee[]>;
  getEmployeeById(id: string): Promise<Employee | null>;
  createEmployee(payload: Omit<Employee, "id">): Promise<Employee>;
  updateEmployee(id: string, payload: Partial<Employee>): Promise<Employee>;
  deactivateEmployee(id: string, reason?: string): Promise<{ success: boolean }>;
}

export interface IAttendanceService {
  getAttendanceLogs(params?: { employeeId?: string; dateRange?: { start: string; end: string } }): Promise<AttendanceRecord[]>;
  punchCheckIn(): Promise<AttendanceRecord>;
  punchCheckOut(): Promise<AttendanceRecord>;
  submitCorrection(request: Omit<AttendanceCorrectionRequest, "id" | "status" | "requestedAt">): Promise<{ id: string; status: string }>;
  reviewCorrection(id: string, decision: "Approved" | "Rejected", notes?: string): Promise<{ success: boolean }>;
}

export interface ILeaveService {
  getLeaveBalances(employeeId: string): Promise<LeaveBalance[]>;
  getLeaveRequests(params?: { employeeId?: string; status?: string }): Promise<LeaveRequest[]>;
  applyLeave(request: Omit<LeaveRequest, "id" | "status" | "appliedOn" | "history">): Promise<LeaveRequest>;
  reviewLeave(id: string, decision: "Approved" | "Rejected", notes?: string): Promise<{ success: boolean }>;
}

export interface IOrganizationService {
  getDepartments(): Promise<Department[]>;
  createDepartment(dept: Omit<Department, "id" | "employeeCount">): Promise<Department>;
  getDesignations(): Promise<Designation[]>;
}

export interface IDocumentService {
  getDocuments(params?: { employeeId?: string; category?: string }): Promise<EmployeeDocument[]>;
  uploadDocument(formData: FormData): Promise<EmployeeDocument>;
}

export interface IAuditService {
  getAuditLogs(params?: { module?: string; dateRange?: { start: string; end: string } }): Promise<AuditEvent[]>;
}
