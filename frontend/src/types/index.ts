export type UserRole = "super_admin" | "hr_admin" | "department_manager" | "employee";

export type EmploymentType = "Full-Time" | "Part-Time" | "Intern" | "Contract";
export type EmploymentStatus = "Active" | "Probation" | "Notice Period" | "Inactive";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  departmentId?: string;
  employeeId?: string;
  designation?: string;
  mustChangePassword?: boolean;
}

export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  workEmail: string;
  personalEmail?: string;
  phone: string;
  gender: "Male" | "Female" | "Other";
  dateOfBirth?: string;
  joiningDate: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  probationEndDate?: string;
  departmentId: string;
  departmentName: string;
  designationId: string;
  designationTitle: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  workLocation: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  address: string;
  avatarUrl?: string;
  exitDetails?: {
    resignationDate?: string;
    lastWorkingDay?: string;
    exitStatus?: string;
  };
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  headEmployeeId?: string;
  headName?: string;
  employeeCount: number;
}

export interface Designation {
  id: string;
  title: string;
  departmentId: string;
  departmentName: string;
  level: string;
  description?: string;
}

export type AttendanceStatus = "Present" | "Absent" | "Half-Day" | "Late" | "Holiday" | "Leave" | "Weekend";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkIn?: string;
  checkOut?: string;
  workDurationHours?: number;
  status: AttendanceStatus;
  source: "Web Check-in" | "Manual Entry" | "Biometric System (Mock)";
  notes?: string;
  isCorrectionRequested?: boolean;
}

export type CorrectionStatus = "Pending" | "Approved" | "Rejected";

export interface AttendanceCorrectionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: CorrectionStatus;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerComments?: string;
}

export type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";
export type LeaveTypeCode = "CL" | "SL" | "PL" | "COMP" | "UNPAID";

export interface LeaveType {
  id: string;
  code: LeaveTypeCode;
  name: string;
  description: string;
  defaultAnnualQuota: number;
  requiresProofAfterDays?: number;
  color: string;
}

export interface LeaveBalance {
  leaveTypeCode: LeaveTypeCode;
  leaveTypeName: string;
  totalQuota: number;
  consumed: number;
  pendingApproval: number;
  available: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeCode: LeaveTypeCode;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  isHalfDay?: boolean;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  approverId?: string;
  approverName?: string;
  decisionNotes?: string;
  decisionDate?: string;
  history: {
    actor: string;
    action: string;
    timestamp: string;
    comment?: string;
  }[];
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  dayOfWeek: string;
  type: "National Holiday" | "Restricted Holiday" | "Company Festival";
  isOptional?: boolean;
}

export type DocumentCategory = "Identification" | "Appointment Letter" | "Education" | "Experience" | "Policy Acknowledgement" | "Other";

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  category: DocumentCategory;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  uploadedBy: string;
  verified: boolean;
  fileUrl?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: "General" | "HR Notice" | "Policy Update" | "Celebration" | "Emergency";
  priority: "Low" | "Medium" | "High";
  publishedDate: string;
  expiryDate?: string;
  targetAudience: "All Employees" | "Department" | "Managers";
  authorName: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  category: "Leave" | "Attendance" | "Announcement" | "Profile" | "System";
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetModule: "Auth" | "Employees" | "Leave" | "Attendance" | "Organization" | "Documents" | "Settings" | "Users";
  targetRecordId?: string;
  description: string;
  ipAddress: string;
  outcome: "Success" | "Failed" | "Warning";
}
