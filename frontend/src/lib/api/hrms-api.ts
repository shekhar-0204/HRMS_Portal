import { api, query } from "./client";
import type { User, Employee, Department, Designation, AttendanceRecord, AttendanceCorrectionRequest, LeaveRequest, LeaveBalance, Holiday, EmployeeDocument, Announcement, AppNotification, AuditEvent } from "@/types";

type Data<T> = { data: T };
type Params = Record<string, string | number | boolean | undefined | null>;
export const authApi = {
  login: (email:string,password:string) => api<{user:User}>("/auth/login", {method:"POST",body:{email,password}}),
  me: () => api<{user:User}>("/auth/me"),
  logout: () => api<void>("/auth/logout", {method:"POST"}),
  changePassword:(currentPassword:string,newPassword:string)=>api<{success:true}>("/auth/change-password",{method:"POST",body:{currentPassword,newPassword}}),
};
export const hrmsApi = {
  employees: (p:Params={}) => api<Data<Employee[]>>(`/employees${query(p)}`),
  createEmployee:(body:unknown)=>api<Data<Employee> & { temporaryCredentials?: { email:string; password:string; role:string; mustChangePassword:boolean } }>("/employees",{method:"POST",body}),
  updateEmployee:(id:string,body:unknown)=>api<Data<Employee>>(`/employees/${id}`,{method:"PATCH",body}),
  deactivateEmployee:(id:string,reason?:string)=>api<{success:true}>(`/employees/${id}/deactivate`,{method:"PATCH",body:{reason}}),
  departments:()=>api<Data<Department[]>>("/departments"),
  createDepartment:(body:unknown)=>api<Data<Department>>("/departments",{method:"POST",body}),
  designations:()=>api<Data<Designation[]>>("/designations"),
  createDesignation:(body:unknown)=>api<Data<Designation>>("/designations",{method:"POST",body}),
  attendance:(p:Params={})=>api<Data<AttendanceRecord[]>>(`/attendance${query(p)}`),
  checkIn:()=>api<Data<AttendanceRecord>>("/attendance/check-in",{method:"POST"}),
  checkOut:()=>api<Data<AttendanceRecord>>("/attendance/check-out",{method:"POST"}),
  corrections:(p:Params={})=>api<Data<AttendanceCorrectionRequest[]>>(`/attendance/corrections${query(p)}`),
  createCorrection:(body:unknown)=>api<Data<AttendanceCorrectionRequest>>("/attendance/corrections",{method:"POST",body}),
  reviewCorrection:(id:string,body:unknown)=>api<Data<AttendanceCorrectionRequest>>(`/attendance/corrections/${id}/review`,{method:"PATCH",body}),
  balances:(p:Params={})=>api<Data<LeaveBalance[]>>(`/leave/balances${query(p)}`),
  leaveRequests:(p:Params={})=>api<Data<LeaveRequest[]>>(`/leave/requests${query(p)}`),
  createLeave:(body:unknown)=>api<Data<LeaveRequest>>("/leave/requests",{method:"POST",body}),
  reviewLeave:(id:string,body:unknown)=>api<Data<LeaveRequest>>(`/leave/requests/${id}/review`,{method:"PATCH",body}),
  cancelLeave:(id:string)=>api<Data<LeaveRequest>>(`/leave/requests/${id}/cancel`,{method:"POST"}),
  holidays:(p:Params={})=>api<Data<Holiday[]>>(`/holidays${query(p)}`),
  createHoliday:(body:unknown)=>api<Data<Holiday>>("/holidays",{method:"POST",body}),
  deleteHoliday:(id:string)=>api<void>(`/holidays/${id}`,{method:"DELETE"}),
  documents:(p:Params={})=>api<Data<EmployeeDocument[]>>(`/documents${query(p)}`),
  uploadDocument:(form:FormData)=>api<Data<EmployeeDocument>>("/documents",{method:"POST",body:form}),
  verifyDocument:(id:string,verified:boolean)=>api<Data<EmployeeDocument>>(`/documents/${id}/verify`,{method:"PATCH",body:{verified}}),
  deleteDocument:(id:string)=>api<void>(`/documents/${id}`,{method:"DELETE"}),
  announcements:()=>api<Data<Announcement[]>>("/announcements"),
  createAnnouncement:(body:unknown)=>api<Data<Announcement>>("/announcements",{method:"POST",body}),
  notifications:()=>api<{data:AppNotification[];unreadCount:number}>("/notifications"),
  markRead:(id:string)=>api<{success:true}>(`/notifications/${id}/read`,{method:"PATCH"}),
  markAllRead:()=>api<{success:true}>("/notifications/read-all",{method:"PATCH"}),
  audit:(p:Params={})=>api<{data:AuditEvent[];nextCursor?:string}>(`/audit-logs${query(p)}`),
};
export type UserSettings = { timezone:string; dateFormat:string; emailNotifications:boolean; inAppNotifications:boolean };
export const settingsApi = {
  get:()=>api<Data<UserSettings>>("/settings/me"),
  update:(body:Partial<Omit<UserSettings,"timezone">>)=>api<Data<UserSettings>>("/settings/me",{method:"PATCH",body}),
};
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1").replace(/\/$/, "");
/** Downloads a server-generated CSV (scoped to the signed-in role) and saves it. */
export async function downloadServerCsv(path:string, fallbackName:string){
  const res = await fetch(`${API_BASE}${path}`,{credentials:"include"});
  if(!res.ok){ let m=`Export failed (${res.status})`; try{const j=await res.json(); if(j?.error) m=j.error;}catch{} throw new Error(m); }
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const name = /filename="?([^";]+)"?/i.exec(cd)?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
export type AdminUser = { id:string; name:string; email:string; employeeId?:string; role:User["role"]; status:"Active"|"Inactive"; lastLogin:string; mustChangePassword:boolean };
export type RoleMatrixRow = { module:string; super_admin:boolean; hr_admin:boolean; manager:boolean; employee:boolean };
export const adminApi = {
 users:()=>api<Data<AdminUser[]>>("/users"),
 changeRole:(id:string,role:string)=>api<Data<AdminUser>>(`/users/${id}/role`,{method:"PATCH",body:{role}}),
 changeStatus:(id:string,isActive:boolean)=>api<Data<AdminUser>>(`/users/${id}/status`,{method:"PATCH",body:{isActive}}),
 resetPassword:(id:string)=>api<{success:true;temporaryPassword:string}>(`/users/${id}/reset-password`,{method:"POST"}),
 roles:()=>api<Data<RoleMatrixRow[]>>("/roles/matrix"),
};
