"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api/hrms-api";
import { AppShell } from "@/components/layout/app-shell";
import { ShieldCheck, Check, X, Lock, Info } from "lucide-react";

export default function RolesPage() {
  const [permissionsMatrix,setPermissionsMatrix]=useState<any[]>([]);
  useEffect(()=>{adminApi.roles().then(r=>setPermissionsMatrix(r.data)).catch(()=>setPermissionsMatrix([]));},[]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800">Roles & Security Permissions Matrix</h2>
          <p className="text-xs text-slate-500 mt-1">
            Explicit Role-Based Access Control (RBAC) boundaries enforced across frontend navigation, screens, and data scope.
          </p>
        </div>

        {/* Matrix Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase">
                  <th className="py-3 px-4">Feature / Action Capability</th>
                  <th className="py-3 px-4 text-center">Super Admin</th>
                  <th className="py-3 px-4 text-center">HR Admin</th>
                  <th className="py-3 px-4 text-center">Dept Manager</th>
                  <th className="py-3 px-4 text-center">Employee / Intern</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissionsMatrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-800">{row.module}</td>
                    
                    <td className="py-3 px-4 text-center">
                      {row.super_admin ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                          <Check size={13} />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400">
                          <X size={13} />
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {row.hr_admin ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                          <Check size={13} />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400">
                          <X size={13} />
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {row.manager ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                          <Check size={13} />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400">
                          <X size={13} />
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {row.employee ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                          <Check size={13} />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400">
                          <X size={13} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Locked modules (Payroll, Recruitment, Appraisals) are disabled in Phase 1 Core Scope</span>
            <span className="font-semibold text-slate-700">Least-Privilege Standard Enforced</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
