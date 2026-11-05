"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useHRMS } from "@/context/hrms-context";
import { History, Search, Filter, ShieldCheck, Download, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function AuditLogsPage() {
  const { auditLogs } = useHRMS();
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesModule = moduleFilter === "all" || log.targetModule === moduleFilter;
    return matchesSearch && matchesModule;
  });

  const handleExportAudit = () => {
    const headers = ["Timestamp,Actor Name,Actor Role,Action,Module,Target ID,Description,IP Address,Outcome"];
    const rows = filteredLogs.map(
      (l) => `"${l.timestamp}","${l.actorName}","${l.actorRole}","${l.action}","${l.targetModule}","${l.targetRecordId || ""}","${l.description}","${l.ipAddress}","${l.outcome}"`
    );
    const csv = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `Graapes_AuditTrail_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Audit trail log exported to CSV");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800">System Audit Trail & Compliance Log</h2>
            <p className="text-xs text-slate-500 mt-1">
              Immutable activity records of employee onboarding, role assignments, leave reviews, and punch adjustments.
            </p>
          </div>

          <button
            onClick={handleExportAudit}
            className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <Download size={15} /> Export Audit Log
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by actor, action, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500"
            />
          </div>

          <div>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700"
            >
              <option value="all">All System Modules</option>
              <option value="Employees">Employees</option>
              <option value="Attendance">Attendance</option>
              <option value="Leave">Leave</option>
              <option value="Organization">Organization</option>
              <option value="Users">Users</option>
              <option value="Documents">Documents</option>
              <option value="Settings">Settings</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono text-slate-700 text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {log.actorName}
                      <span className="block text-[10px] text-slate-400 capitalize">{log.actorRole.replace("_", " ")}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800 text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {log.targetModule}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm truncate">{log.description}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{log.ipAddress}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {log.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
