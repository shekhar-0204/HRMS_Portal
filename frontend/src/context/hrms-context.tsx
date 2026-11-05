"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Employee, Department, Designation, AttendanceRecord, AttendanceCorrectionRequest, LeaveRequest, LeaveBalance, Holiday, EmployeeDocument, Announcement, AppNotification, AuditEvent } from "@/types";
import { authApi, hrmsApi } from "@/lib/api/hrms-api";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";

type Theme = "light" | "dark";
interface HRMSContextType {
  currentUser: User; authLoading: boolean; isAuthenticated: boolean;
  login: (email:string,password:string)=>Promise<User>;
  logout: ()=>Promise<void>;
  refreshSession: ()=>Promise<User|null>;
  employees: Employee[]; departments: Department[]; designations: Designation[];
  attendanceRecords: AttendanceRecord[]; correctionRequests: AttendanceCorrectionRequest[];
  leaveRequests: LeaveRequest[]; leaveBalances: LeaveBalance[]; holidays: Holiday[]; documents: EmployeeDocument[];
  announcements: Announcement[]; notifications: AppNotification[]; auditLogs: AuditEvent[];
  createEmployee:(e:Omit<Employee,"id">)=>Promise<{ employee: Employee; temporaryCredentials: { email:string; password:string; role:string; mustChangePassword:boolean } } | null>; updateEmployee:(id:string,e:Partial<Employee>)=>Promise<boolean>; deactivateEmployee:(id:string,reason?:string)=>Promise<boolean>;
  recordCheckIn:()=>Promise<boolean>; recordCheckOut:()=>Promise<boolean>; recordBackdatedAttendance:(date:string,checkIn:string,checkOut:string,reason:string)=>Promise<boolean>;
  submitAttendanceCorrection:(r:Omit<AttendanceCorrectionRequest,"id"|"status"|"requestedAt">)=>Promise<boolean>; reviewAttendanceCorrection:(id:string,d:"Approved"|"Rejected",comments?:string)=>Promise<boolean>;
  submitLeaveRequest:(r:Omit<LeaveRequest,"id"|"status"|"appliedOn"|"history"> & { isHalfDay?: boolean })=>Promise<boolean>; reviewLeaveRequest:(id:string,d:"Approved"|"Rejected",notes?:string)=>Promise<boolean>; cancelLeaveRequest:(id:string)=>Promise<boolean>;
  createDepartment:(d:Omit<Department,"id"|"employeeCount">)=>Promise<boolean>; createDesignation:(d:Omit<Designation,"id">)=>Promise<boolean>;
  createAnnouncement:(a:Omit<Announcement,"id"|"publishedDate"|"authorName">)=>Promise<boolean>;
  markNotificationAsRead:(id:string)=>Promise<void>; markAllNotificationsAsRead:()=>Promise<void>;
  uploadDocument:(d:FormData|Record<string,unknown>)=>Promise<boolean>; verifyDocument:(id:string,verified:boolean)=>Promise<boolean>; deleteDocument:(id:string)=>Promise<boolean>; completePasswordChange:(currentPassword:string,newPassword:string)=>Promise<boolean>; deleteHoliday:(id:string)=>Promise<boolean>; addHoliday:(h:Omit<Holiday,"id">)=>Promise<boolean>;
  refreshData:()=>Promise<void>;
  theme:Theme; setTheme:(t:Theme)=>void; mobileSidebarOpen:boolean; setMobileSidebarOpen:(b:boolean)=>void; toggleMobileSidebar:()=>void;
}
const HRMSContext=createContext<HRMSContextType|undefined>(undefined);
const message=(e:unknown)=>e instanceof ApiError?e.message:e instanceof Error?e.message:"Something went wrong";

export function HRMSProvider({children}:{children:React.ReactNode}){
 const EMPTY_USER: User = { id:"", email:"", name:"", role:"employee" };
 const [currentUser,setCurrentUser]=useState<User>(EMPTY_USER), [authLoading,setAuthLoading]=useState(true);
 const [employees,setEmployees]=useState<Employee[]>([]),[departments,setDepartments]=useState<Department[]>([]),[designations,setDesignations]=useState<Designation[]>([]),[attendanceRecords,setAttendanceRecords]=useState<AttendanceRecord[]>([]),[correctionRequests,setCorrectionRequests]=useState<AttendanceCorrectionRequest[]>([]),[leaveRequests,setLeaveRequests]=useState<LeaveRequest[]>([]),[leaveBalances,setLeaveBalances]=useState<LeaveBalance[]>([]),[holidays,setHolidays]=useState<Holiday[]>([]),[documents,setDocuments]=useState<EmployeeDocument[]>([]),[announcements,setAnnouncements]=useState<Announcement[]>([]),[notifications,setNotifications]=useState<AppNotification[]>([]),[auditLogs,setAuditLogs]=useState<AuditEvent[]>([]);
 const [theme,setThemeState]=useState<Theme>("light"),[mobileSidebarOpen,setMobileSidebarOpen]=useState(false);
 // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the persisted theme once after hydration (localStorage is client-only)
 useEffect(()=>{const t=localStorage.getItem("hrms-theme")==="dark"?"dark":"light";setThemeState(t);},[]);
 useEffect(()=>{document.documentElement.classList.toggle("dark",theme==="dark");},[theme]);
 const setTheme=(t:Theme)=>{setThemeState(t);localStorage.setItem("hrms-theme",t);};
 const refreshData=async()=>{
   if(!currentUser.id||currentUser.mustChangePassword) return;
   const calls=await Promise.allSettled([
    hrmsApi.employees(),hrmsApi.departments(),hrmsApi.designations(),hrmsApi.attendance(),hrmsApi.corrections(),hrmsApi.leaveRequests(),hrmsApi.balances({year:new Date().getFullYear()}),hrmsApi.holidays({year:new Date().getFullYear()}),hrmsApi.documents(),hrmsApi.announcements(),hrmsApi.notifications(), (currentUser.role === "super_admin" || currentUser.role === "hr_admin") ? hrmsApi.audit({limit:100}) : Promise.resolve({data:[],nextCursor:undefined})
   ]);
   const set=(i:number,fn:(x:any)=>void)=>{const r=calls[i];if(r.status==="fulfilled")fn(r.value);};
   set(0,x=>setEmployees(x.data));set(1,x=>setDepartments(x.data));set(2,x=>setDesignations(x.data));set(3,x=>setAttendanceRecords(x.data));set(4,x=>setCorrectionRequests(x.data));set(5,x=>setLeaveRequests(x.data));set(6,x=>setLeaveBalances(x.data));set(7,x=>setHolidays(x.data));set(8,x=>setDocuments(x.data));set(9,x=>setAnnouncements(x.data));set(10,x=>setNotifications(x.data));set(11,x=>setAuditLogs(x.data));
 };
 const resetAllData=()=>{setEmployees([]);setDepartments([]);setDesignations([]);setAttendanceRecords([]);setCorrectionRequests([]);setLeaveRequests([]);setLeaveBalances([]);setHolidays([]);setDocuments([]);setAnnouncements([]);setNotifications([]);setAuditLogs([]);};
 const refreshSession=async()=>{try{const r=await authApi.me();setCurrentUser(r.user);return r.user;}catch{setCurrentUser(EMPTY_USER);resetAllData();return null;}};
 // Any API call answering 401 (session expired / revoked) sends the user back to the login screen.
 useEffect(()=>{const onUnauthorized=()=>{setCurrentUser(EMPTY_USER);resetAllData();};window.addEventListener("hrms:unauthorized",onUnauthorized);return()=>window.removeEventListener("hrms:unauthorized",onUnauthorized);// eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 // Keep the notification bell fresh (every 60 s while signed in and the tab is visible).
 useEffect(()=>{if(!currentUser.id||currentUser.mustChangePassword)return;const t=setInterval(async()=>{if(document.visibilityState!=="visible")return;try{const r=await hrmsApi.notifications();setNotifications(r.data);}catch{}},60000);return()=>clearInterval(t);},[currentUser.id,currentUser.mustChangePassword]);
 useEffect(()=>{(async()=>{const u=await refreshSession();setAuthLoading(false);if(u){}})();},[]);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{if(currentUser.id&&!currentUser.mustChangePassword) refreshData();},[currentUser?.id,currentUser?.mustChangePassword]);
 const login=async(email:string,password:string)=>{const r=await authApi.login(email,password);setCurrentUser(r.user);return r.user;};
 const logout=async()=>{try{await authApi.logout();}finally{setCurrentUser(EMPTY_USER);resetAllData();}};
 const createEmployee=async(e:any)=>{try{const r:any=await hrmsApi.createEmployee(e);setEmployees(p=>[r.data,...p]);toast.success("Employee created successfully");return { employee:r.data, temporaryCredentials:r.temporaryCredentials };}catch(err){toast.error(message(err));return null;}};
 const updateEmployee=async(id:string,e:any)=>{try{const r=await hrmsApi.updateEmployee(id,e);setEmployees(p=>p.map(x=>x.id===id?r.data:x));toast.success("Employee updated successfully");return true;}catch(err){toast.error(message(err));return false;}};
 const deactivateEmployee=async(id:string,reason?:string)=>{try{await hrmsApi.deactivateEmployee(id,reason);await refreshData();toast.success("Employee deactivated successfully");return true;}catch(err){toast.error(message(err));return false;}};
 const recordCheckIn=async()=>{try{const r=await hrmsApi.checkIn();setAttendanceRecords(p=>[r.data,...p.filter(x=>x.id!==r.data.id)]);toast.success("Check-in recorded");return true;}catch(err){toast.error(message(err));return false;}};
 const recordCheckOut=async()=>{try{const r=await hrmsApi.checkOut();setAttendanceRecords(p=>p.map(x=>x.id===r.data.id?r.data:x));toast.success("Check-out recorded");return true;}catch(err){toast.error(message(err));return false;}};
 const recordBackdatedAttendance=async(date:string,checkIn:string,checkOut:string,reason:string)=>submitAttendanceCorrection({employeeId:currentUser?.employeeId||"",employeeName:currentUser?.name||"",date,requestedCheckIn:checkIn,requestedCheckOut:checkOut,reason});
 const submitAttendanceCorrection=async(r:any)=>{try{const x=await hrmsApi.createCorrection({date:r.date,requestedCheckIn:r.requestedCheckIn,requestedCheckOut:r.requestedCheckOut,reason:r.reason});setCorrectionRequests(p=>[x.data,...p]);toast.success("Attendance correction submitted");return true;}catch(err){toast.error(message(err));return false;}};
 const reviewAttendanceCorrection=async(id:string,d:"Approved"|"Rejected",comments?:string)=>{try{const x=await hrmsApi.reviewCorrection(id,{decision:d,notes:comments});setCorrectionRequests(p=>p.map(v=>v.id===id?x.data:v));toast.success("Correction reviewed");return true;}catch(err){toast.error(message(err));return false;}};
 const submitLeaveRequest=async(r:any)=>{try{const x=await hrmsApi.createLeave({leaveTypeCode:r.leaveTypeCode,startDate:r.startDate,endDate:r.endDate,isHalfDay:r.isHalfDay??false,reason:r.reason});setLeaveRequests(p=>[x.data,...p]);hrmsApi.balances({year:new Date().getFullYear()}).then(b=>setLeaveBalances(b.data)).catch(()=>undefined);toast.success("Leave request submitted");return true;}catch(err){toast.error(message(err));return false;}};
 const reviewLeaveRequest=async(id:string,d:"Approved"|"Rejected",notes?:string)=>{try{const x=await hrmsApi.reviewLeave(id,{decision:d,notes});setLeaveRequests(p=>p.map(v=>v.id===id?x.data:v));toast.success("Leave request reviewed");return true;}catch(err){toast.error(message(err));return false;}};
 const cancelLeaveRequest=async(id:string)=>{try{const x=await hrmsApi.cancelLeave(id);setLeaveRequests(p=>p.map(v=>v.id===id?x.data:v));hrmsApi.balances({year:new Date().getFullYear()}).then(b=>setLeaveBalances(b.data)).catch(()=>undefined);toast.success("Leave request cancelled");return true;}catch(err){toast.error(message(err));return false;}};
 const createDepartment=async(d:any)=>{try{const x=await hrmsApi.createDepartment(d);setDepartments(p=>[...p,x.data]);toast.success("Department created");return true;}catch(err){toast.error(message(err));return false;}};
 const createDesignation=async(d:any)=>{try{const x=await hrmsApi.createDesignation(d);setDesignations(p=>[...p,x.data]);toast.success("Designation created");return true;}catch(err){toast.error(message(err));return false;}};
 const createAnnouncement=async(a:any)=>{try{const x=await hrmsApi.createAnnouncement(a);setAnnouncements(p=>[x.data,...p]);toast.success("Announcement published");return true;}catch(err){toast.error(message(err));return false;}};
 const markNotificationAsRead=async(id:string)=>{try{await hrmsApi.markRead(id);setNotifications(p=>p.map(n=>n.id===id?{...n,read:true}:n));}catch(err){toast.error(message(err));}};
 const markAllNotificationsAsRead=async()=>{try{await hrmsApi.markAllRead();setNotifications(p=>p.map(n=>({...n,read:true})));}catch(err){toast.error(message(err));}};
 const uploadDocument=async(d:any)=>{try{const form=d instanceof FormData?d:(()=>{const f=new FormData();Object.entries(d).forEach(([k,v])=>{if(k!=="id"&&v!==undefined)f.append(k,v as any)});return f;})();const x=await hrmsApi.uploadDocument(form);setDocuments(p=>[x.data,...p]);toast.success("Document uploaded");return true;}catch(err){toast.error(message(err));return false;}};
 const verifyDocument=async(id:string,verified:boolean)=>{try{const x=await hrmsApi.verifyDocument(id,verified);setDocuments(p=>p.map(d=>d.id===id?x.data:d));toast.success(verified?"Document verified":"Verification removed");return true;}catch(err){toast.error(message(err));return false;}};
 const deleteDocument=async(id:string)=>{try{await hrmsApi.deleteDocument(id);setDocuments(p=>p.filter(d=>d.id!==id));toast.success("Document deleted");return true;}catch(err){toast.error(message(err));return false;}};
 /** Changes the password, then reloads the session (clears mustChangePassword) and all data that was blocked until now. */
 const completePasswordChange=async(currentPassword:string,newPassword:string)=>{try{await authApi.changePassword(currentPassword,newPassword);const u=await refreshSession();if(u){const calls=await Promise.allSettled([hrmsApi.employees(),hrmsApi.departments(),hrmsApi.designations(),hrmsApi.attendance(),hrmsApi.corrections(),hrmsApi.leaveRequests(),hrmsApi.balances({year:new Date().getFullYear()}),hrmsApi.holidays({year:new Date().getFullYear()}),hrmsApi.documents(),hrmsApi.announcements(),hrmsApi.notifications()]);const v=(i:number)=>{const r=calls[i];return r.status==="fulfilled"?r.value:null;};const g=<T,>(i:number,fn:(x:T)=>void)=>{const r=v(i) as {data:T}|null;if(r)fn(r.data);};g(0,setEmployees);g(1,setDepartments);g(2,setDesignations);g(3,setAttendanceRecords);g(4,setCorrectionRequests);g(5,setLeaveRequests);g(6,setLeaveBalances);g(7,setHolidays);g(8,setDocuments);g(9,setAnnouncements);g(10,setNotifications);}toast.success("Password changed successfully");return true;}catch(err){toast.error(message(err));return false;}};
 const addHoliday=async(h:any)=>{try{const x=await hrmsApi.createHoliday({name:h.name,date:h.date,type:h.type,isOptional:h.isOptional});setHolidays(p=>[...p,x.data]);toast.success("Holiday added");return true;}catch(err){toast.error(message(err));return false;}};
 const deleteHoliday=async(id:string)=>{try{await hrmsApi.deleteHoliday(id);setHolidays(p=>p.filter(h=>h.id!==id));toast.success("Holiday deleted");return true;}catch(err){toast.error(message(err));return false;}};
 const value:HRMSContextType={currentUser,authLoading,isAuthenticated:!!currentUser.id,login,logout,refreshSession,employees,departments,designations,attendanceRecords,correctionRequests,leaveRequests,leaveBalances,holidays,documents,announcements,notifications,auditLogs,createEmployee,updateEmployee,deactivateEmployee,recordCheckIn,recordCheckOut,recordBackdatedAttendance,submitAttendanceCorrection,reviewAttendanceCorrection,submitLeaveRequest,reviewLeaveRequest,cancelLeaveRequest,createDepartment,createDesignation,createAnnouncement,markNotificationAsRead,markAllNotificationsAsRead,uploadDocument,verifyDocument,deleteDocument,completePasswordChange,deleteHoliday,addHoliday,refreshData,theme,setTheme,mobileSidebarOpen,setMobileSidebarOpen,toggleMobileSidebar:()=>setMobileSidebarOpen(v=>!v)};
 return <HRMSContext.Provider value={value}>{children}</HRMSContext.Provider>;
}
export function useHRMS(){const c=useContext(HRMSContext);if(!c)throw new Error("useHRMS must be used within HRMSProvider");return c;}
