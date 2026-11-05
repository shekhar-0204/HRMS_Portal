"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useHRMS } from "@/context/hrms-context";
import {
  Building2,
  Briefcase,
  Plus,
  Users,
  Layers,
  ChevronRight,
  GitFork,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Employee } from "@/types";

export default function OrganizationPage() {
  const { currentUser, departments, designations, employees, createDepartment, createDesignation } = useHRMS();

  const [activeTab, setActiveTab] = useState<"departments" | "designations" | "hierarchy">("departments");
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddDes, setShowAddDes] = useState(false);
  const [selectedDeptModal, setSelectedDeptModal] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [newDept, setNewDept] = useState({ name: "", code: "", description: "" });
  const [newDes, setNewDes] = useState({ title: "", departmentId: departments[0]?.id || "dept-01", level: "L3 - Mid" });

  const canManage = currentUser.role === "super_admin" || currentUser.role === "hr_admin";

  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.name || !newDept.code) {
      toast.error("Department name and code are required");
      return;
    }
    createDepartment(newDept);
    setNewDept({ name: "", code: "", description: "" });
    setShowAddDept(false);
  };

  const handleCreateDes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDes.title) {
      toast.error("Designation title is required");
      return;
    }
    const dObj = departments.find((d) => d.id === newDes.departmentId);
    createDesignation({
      ...newDes,
      departmentName: dObj?.name || "General",
    });
    setNewDes({ title: "", departmentId: departments[0]?.id || "dept-01", level: "L3 - Mid" });
    setShowAddDes(false);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800">
              {currentUser.role === "hr_admin" ? "Departments & Employees" : "Organization Structure"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {currentUser.role === "hr_admin"
                ? "Department-wise employee directory, active staff counts, designations, and team hierarchy."
                : "Configure departments, job titles/designations, and reporting structure hierarchies."}
            </p>
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddDept(true)}
                className="py-2 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition"
              >
                <Plus size={15} /> Add Department
              </button>
              <button
                onClick={() => setShowAddDes(true)}
                className="py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
              >
                <Plus size={15} /> Add Designation
              </button>
            </div>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("departments")}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === "departments"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {currentUser.role === "hr_admin" ? "Department & Employees" : "Departments"} ({departments.length})
          </button>
          <button
            onClick={() => setActiveTab("designations")}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === "designations"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Designations & Bands ({designations.length})
          </button>
          <button
            onClick={() => setActiveTab("hierarchy")}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === "hierarchy"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Reporting Hierarchy Chart
          </button>
        </div>

        {/* Tab 1: Departments (Compact Box Card Grid with Tap to View Employees) */}
        {activeTab === "departments" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const deptEmployees = employees.filter((e) => e.departmentId === dept.id);
              return (
                <div
                  key={dept.id}
                  onClick={() => setSelectedDeptModal(dept.id)}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between cursor-pointer group select-none relative overflow-hidden"
                >
                  {/* Subtle top indicator on hover */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div>
                    {/* Top Row: Icon & Code */}
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                        <Building2 size={20} />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {dept.code}
                      </span>
                    </div>

                    {/* Department Title & Description */}
                    <h3 className="font-bold text-slate-900 text-sm mt-3.5 group-hover:text-blue-600 transition-colors flex items-center justify-between">
                      <span>{dept.name}</span>
                      <ChevronRight size={15} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {dept.description || "General operations & business unit"}
                    </p>

                    {/* Compact Avatars & Head */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {deptEmployees.slice(0, 4).map((emp) => (
                          <img
                            key={emp.id}
                            src={emp.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                            alt={emp.fullName}
                            className="w-6 h-6 rounded-full object-cover border-2 border-white ring-1 ring-slate-100"
                            title={emp.fullName}
                          />
                        ))}
                        {deptEmployees.length > 4 && (
                          <span className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white text-[9px] font-bold text-slate-600 flex items-center justify-center">
                            +{deptEmployees.length - 4}
                          </span>
                        )}
                        {deptEmployees.length === 0 && (
                          <span className="text-[11px] text-slate-400">No members</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 truncate max-w-[130px]">
                        Head: <strong className="text-slate-700">{dept.headName || "Assigned"}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Click prompt */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-xs text-slate-500">
                    <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <Users size={13} className="text-blue-600" />
                      {deptEmployees.length} Members
                    </span>
                    <span className="text-[11px] font-semibold text-blue-600 group-hover:underline">
                      View Team →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Designations */}
        {activeTab === "designations" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="py-3 px-4">Designation Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Level / Grade Band</th>
                  <th className="py-3 px-4">Active Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {designations.map((des) => {
                  const staffCount = employees.filter((e) => e.designationId === des.id).length;
                  return (
                    <tr key={des.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                        <Briefcase size={14} className="text-emerald-600" /> {des.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{des.departmentName}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {des.level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{staffCount} Personnel</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Hierarchy Tree */}
        {activeTab === "hierarchy" && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Graapes Organizational Tree</h3>
              <p className="text-xs text-slate-500">Visual reporting line representation</p>
            </div>

            <OrgTree employees={employees.filter((e) => e.status !== "Inactive")} />
          </div>
        )}

        {/* Create Dept Modal */}
        {showAddDept && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setShowAddDept(false)} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200/80">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-sm text-slate-900">Create New Department</h3>
                <button onClick={() => setShowAddDept(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateDept} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marketing & Growth"
                    value={newDept.name}
                    onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MKT"
                    value={newDept.code}
                    onChange={(e) => setNewDept({ ...newDept, code: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Department operational scope..."
                    value={newDept.description}
                    onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDept(false)}
                    className="py-1.5 px-3 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                  >
                    Save Department
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Designation Modal */}
        {showAddDes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setShowAddDes(false)} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200/80">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-sm text-slate-900">Create New Designation</h3>
                <button onClick={() => setShowAddDes(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateDes} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lead Cloud Architect"
                    value={newDes.title}
                    onChange={(e) => setNewDes({ ...newDes, title: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={newDes.departmentId}
                    onChange={(e) => setNewDes({ ...newDes, departmentId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Career Band / Level</label>
                  <select
                    value={newDes.level}
                    onChange={(e) => setNewDes({ ...newDes, level: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="L1 - Intern">L1 - Intern</option>
                    <option value="L2 - Associate">L2 - Associate</option>
                    <option value="L3 - Mid">L3 - Mid</option>
                    <option value="L4 - Senior">L4 - Senior</option>
                    <option value="L5 - Lead / Manager">L5 - Lead / Manager</option>
                    <option value="L6 - Executive">L6 - Executive</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDes(false)}
                    className="py-1.5 px-3 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                  >
                    Save Designation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Department Team Members Modal (Opened on Box Tap) */}
        {selectedDeptModal && (() => {
          const activeDept = departments.find((d) => d.id === selectedDeptModal);
          const deptEmployees = employees.filter((e) => e.departmentId === selectedDeptModal);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity"
                onClick={() => setSelectedDeptModal(null)}
              />
              <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh] border border-slate-200/90 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900">{activeDept?.name}</h3>
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                          {activeDept?.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {deptEmployees.length} Team Members • Head: <strong className="text-slate-700">{activeDept?.headName || "Assigned"}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDeptModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body / Employee Grid */}
                <div className="p-5 overflow-y-auto space-y-3">
                  {deptEmployees.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No personnel currently assigned to this department.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {deptEmployees.map((emp) => (
                        <div
                          key={emp.id}
                          onClick={() => setSelectedEmployee(emp)}
                          className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-2xs transition flex items-start gap-3 cursor-pointer group"
                          title="Click to view full employee profile"
                        >
                          <img
                            src={emp.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                            alt={emp.fullName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0 group-hover:ring-2 group-hover:ring-blue-300 transition"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                {emp.fullName}
                              </h4>
                              <span
                                className={cn(
                                  "text-[9px] font-semibold px-1.5 py-0.2 rounded-full",
                                  emp.status === "Active"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                )}
                              >
                                {emp.status}
                              </span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-600 truncate mt-0.5">
                              {emp.designationTitle}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                              <span>{emp.employeeId}</span>
                              <span>•</span>
                              <span className="truncate">{emp.workEmail}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                              <span>Manager: <strong className="text-slate-700">{emp.reportingManagerName || "Direct"}</strong></span>
                              <span className="text-blue-600 font-semibold group-hover:underline">View Profile →</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">
                    Total Active Team: <strong>{deptEmployees.length}</strong>
                  </span>
                  <button
                    onClick={() => setSelectedDeptModal(null)}
                    className="py-1.5 px-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Employee Full Profile Modal (Centered Floating Card) */}
        {selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-md transition-opacity"
              onClick={() => setSelectedEmployee(null)}
            />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh] border border-slate-200/90 animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={selectedEmployee.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                    alt={selectedEmployee.fullName}
                    className="w-12 h-12 rounded-full border-2 border-white object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="font-bold text-base truncate">{selectedEmployee.fullName}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                      <span className="text-blue-400 font-mono">{selectedEmployee.employeeId}</span>
                      <span>•</span>
                      <span className="text-slate-300 truncate">{selectedEmployee.designationTitle}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition flex-shrink-0 ml-2"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 flex-1 overflow-y-auto text-xs text-slate-700">
                {/* Employment Section */}
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 space-y-2.5">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 text-blue-600">
                    <Briefcase size={14} /> Employment Information
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Department</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.departmentName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Employment Type</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.employmentType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Date of Joining</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.joiningDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Status</span>
                      <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] w-fit inline-block">
                        {selectedEmployee.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Work Location</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.workLocation}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Reporting Manager</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.reportingManagerName || "Vikram Malhotra"}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Section */}
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 text-blue-600">
                    <Users size={14} /> Contact Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Work Email</span>
                      <span className="font-semibold text-slate-800 font-mono text-[11px] truncate block">{selectedEmployee.workEmail}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Phone</span>
                      <span className="font-semibold text-slate-800 font-mono text-[11px]">{selectedEmployee.phone}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[10px]">Residential Address</span>
                      <span className="font-semibold text-slate-800 text-[11px]">{selectedEmployee.address || "Bangalore, Karnataka"}</span>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 text-blue-600">
                    <CheckCircle2 size={14} /> Emergency Contact
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Name</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.emergencyContact?.name || "Not provided"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Relationship</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.emergencyContact?.relationship || "Family"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">Emergency Phone</span>
                      <span className="font-semibold text-slate-800 font-mono">{selectedEmployee.emergencyContact?.phone || "Not provided"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="py-1.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/** Reporting-line tree built from real employee data (reportingManagerId). Cycle-safe. */
function OrgTree({ employees }: { employees: Employee[] }) {
  const ids = new Set(employees.map((e) => e.id));
  const kids = new Map<string, Employee[]>();
  const roots: Employee[] = [];
  for (const e of employees) {
    if (e.reportingManagerId && ids.has(e.reportingManagerId) && e.reportingManagerId !== e.id) {
      kids.set(e.reportingManagerId, [...(kids.get(e.reportingManagerId) ?? []), e]);
    } else roots.push(e);
  }
  if (employees.length === 0) return <p className="text-xs text-slate-400">No employees to show yet.</p>;
  const render = (e: Employee, depth: number, seen: Set<string>) => {
    if (seen.has(e.id)) return null;
    const next = new Set(seen).add(e.id);
    return (
      <div key={e.id} className={depth === 0 ? "space-y-2" : "mt-2 pl-4 border-l-2 border-emerald-300 space-y-2"}>
        <div className={depth === 0 ? "p-3.5 bg-slate-900 text-white rounded-lg max-w-md" : "p-2 bg-white rounded border border-emerald-100 text-xs text-slate-700"}>
          <span className="font-bold">{e.fullName}</span>{" "}
          <span className={depth === 0 ? "text-xs text-slate-300" : "text-slate-500"}>({e.designationTitle} - {e.employeeId} - {e.departmentName})</span>
        </div>
        {(kids.get(e.id) ?? []).map((c) => render(c, depth + 1, next))}
      </div>
    );
  };
  return <div className="space-y-4">{roots.map((r) => render(r, 0, new Set()))}</div>;
}
