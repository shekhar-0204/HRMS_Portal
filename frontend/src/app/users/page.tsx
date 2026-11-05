"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useHRMS } from "@/context/hrms-context";
import { UserRole } from "@/types";
import {
  UserCheck,
  Shield,
  Key,
  Mail,
  UserX,
  CheckCircle,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi, type AdminUser } from "@/lib/api/hrms-api";

export default function UsersPage() {
  const { currentUser, employees } = useHRMS();

  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [tempPassword, setTempPassword] = useState<{ name: string; email: string; password: string } | null>(null);

  useEffect(()=>{ adminApi.users().then(r=>setUsersList(r.data)).catch(e=>toast.error(e instanceof Error?e.message:"Unable to load users")); },[]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try { const r=await adminApi.changeRole(userId,newRole); setUsersList(prev=>prev.map(u=>u.id===userId?r.data:u)); toast.success("Role updated successfully"); } catch(e){ toast.error(e instanceof Error?e.message:"Unable to update role"); }
  };

  const handleToggleStatus = async (userId: string) => {
    const user=usersList.find(u=>u.id===userId); if(!user)return; try { const r=await adminApi.changeStatus(userId,user.status!=="Active"); setUsersList(prev=>prev.map(u=>u.id===userId?r.data:u)); toast.success("Account status updated"); } catch(e){ toast.error(e instanceof Error?e.message:"Unable to update status"); }
  };

  const handleResetPassword = async (user: AdminUser) => {
    if (!window.confirm(`Reset the password for ${user.email}? They will be signed out everywhere.`)) return;
    try {
      const r = await adminApi.resetPassword(user.id);
      setTempPassword({ name: user.name, email: user.email, password: r.temporaryPassword });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to reset password"); }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800">User Account Administration</h2>
            <p className="text-xs text-slate-500 mt-1">
              Super Admin access control: Link employee profiles to portal logins, assign roles, and toggle access states.
            </p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">Security Note:</span> All user roles and account status changes are saved through the HRMS backend API and enforced server-side.
          </div>
        </div>

        {/* User Accounts Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Work Email</th>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <span className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px]">
                        {user.name.charAt(0)}
                      </span>
                      {user.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{user.email}</td>
                    <td className="py-3 px-4 font-mono font-medium text-emerald-700">{user.employeeId}</td>
                    <td className="py-3 px-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        className="p-1 text-xs bg-slate-50 border border-slate-200 rounded font-medium text-slate-800 focus:outline-none"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="hr_admin">HR Admin</option>
                        <option value="department_manager">Department Manager</option>
                        <option value="employee">Employee / Intern</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.status === "Active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">{user.lastLogin}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="mr-2 py-1 px-2.5 rounded font-semibold text-xs transition bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        Reset password
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        className={`py-1 px-2.5 rounded font-semibold text-xs transition ${
                          user.status === "Active"
                            ? "bg-rose-50 hover:bg-rose-100 text-rose-700"
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {user.status === "Active" ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {tempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md" />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-3 text-xs border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Temporary password for {tempPassword.name}</h3>
            <p className="text-slate-500">Copy it now. It is shown only once and must be changed at first sign-in.</p>
            <div className="p-3 bg-slate-50 border rounded-lg font-mono text-sm select-all">{tempPassword.email}<br />{tempPassword.password}</div>
            <div className="flex justify-end gap-2">
              <button onClick={async () => { try { await navigator.clipboard.writeText(`Email: ${tempPassword.email}\nTemporary Password: ${tempPassword.password}`); toast.success("Copied"); } catch { toast.error("Could not copy"); } }} className="py-1.5 px-3 bg-slate-100 rounded-lg font-semibold">Copy</button>
              <button onClick={() => setTempPassword(null)} className="py-1.5 px-3 bg-emerald-600 text-white rounded-lg font-bold">Done</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
