"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useHRMS } from "@/context/hrms-context";
import { Employee, EmploymentType, EmploymentStatus } from "@/types";
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Mail,
  Phone,
  Building2,
  Calendar,
  X,
  CheckCircle,
  MoreVertical,
  ShieldAlert,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function EmployeesPage() {
  const {
    currentUser,
    employees,
    departments,
    designations,
    createEmployee,
    updateEmployee,
    deactivateEmployee,
  } = useHRMS();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  // Modals & Panels
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState<Employee | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [credentials, setCredentials] = useState<{ name:string; email:string; password:string } | null>(null);
  const [creating, setCreating] = useState(false);


  // New employee form state. Employee ID stays empty so the server assigns the next free GRP-xxx;
  // department / designation / manager are chosen from the real lists (never placeholder IDs).
  const todayLocal = () => format(new Date(), "yyyy-MM-dd");
  const emptyEmp = () => ({
    employeeId: "",
    fullName: "",
    workEmail: "",
    personalEmail: "",
    phone: "",
    gender: "Male" as "Male" | "Female" | "Other",
    joiningDate: "",
    employmentType: "Full-Time" as EmploymentType,
    status: "Active" as EmploymentStatus,
    departmentId: "",
    designationId: "",
    reportingManagerId: "",
    workLocation: "Bangalore HQ",
    address: "",
    emergencyContact: { name: "", relationship: "Parent", phone: "" },
  });
  const [newEmp, setNewEmp] = useState(emptyEmp);

  // Effective selections: fall back to the first real option, and only offer designations of the chosen department.
  const effDeptId = newEmp.departmentId || departments[0]?.id || "";
  const deptDesignations = designations.filter((d) => d.departmentId === effDeptId);
  const effDesId = deptDesignations.some((d) => d.id === newEmp.designationId) ? newEmp.designationId : deptDesignations[0]?.id || "";

  // Filter logic respecting Manager scope
  const filteredEmployees = employees.filter((emp) => {
    // If manager, only their team
    if (currentUser.role === "department_manager") {
      if (emp.departmentId !== currentUser.departmentId) return false;
    }

    const matchesSearch =
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.workEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept === "all" || emp.departmentId === selectedDept;
    const matchesStatus = selectedStatus === "all" || emp.status === selectedStatus;
    const matchesType = selectedType === "all" || emp.employmentType === selectedType;

    return matchesSearch && matchesDept && matchesStatus && matchesType;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.fullName || !newEmp.workEmail) {
      toast.error("Please enter the employee name and work email");
      return;
    }
    if (!canManage) {
      toast.error("Only Super Admin and HR Admin can add employees");
      return;
    }

    if (!effDeptId || !effDesId) {
      toast.error("Please choose a department and a designation");
      return;
    }
    const code = newEmp.employeeId.trim().toUpperCase();
    if (code && !/^GRP-\d{3,}$/.test(code)) {
      toast.error("Employee ID must look like GRP-016 (or leave it empty to auto-assign)");
      return;
    }

    setCreating(true);
    const { reportingManagerId, employeeId: _ignored, ...rest } = newEmp;
    void _ignored;
    const result = await createEmployee({
      ...rest,
      ...(code ? { employeeId: code } : {}),
      departmentId: effDeptId,
      designationId: effDesId,
      ...(reportingManagerId ? { reportingManagerId } : {}),
    } as unknown as Parameters<typeof createEmployee>[0]);
    setCreating(false);

    if (!result) return;

    setShowCreateModal(false);
    const temp = result.temporaryCredentials;
    if (temp?.email && temp?.password) {
      setCredentials({ name: result.employee.fullName, email: temp.email, password: temp.password });
    } else {
      toast.warning("Employee was created, but temporary credentials were not returned by the server.");
    }

    setNewEmp(emptyEmp());
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    const text = `Graapes HRMS Login Credentials\nEmail: ${credentials.email}\nTemporary Password: ${credentials.password}`;
    try { await navigator.clipboard.writeText(text); toast.success("Credentials copied to clipboard"); }
    catch { toast.error("Could not copy credentials"); }
  };

  const openGmailCompose = () => {
    if (!credentials) return;
    const subject = encodeURIComponent("Your Graapes HRMS Login Credentials");
    const body = encodeURIComponent(`Hello ${credentials.name},\n\nWelcome to Graapes HRMS!\n\nYour account has been created successfully.\n\nEmail: ${credentials.email}\nTemporary Password: ${credentials.password}\n\nPlease sign in and change your password immediately.\n\nRegards,\nGraapes HRMS Team`);
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(credentials.email)}&su=${subject}&body=${body}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const csvCell = (v: unknown) => {
    let t = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; // neutralise spreadsheet formula injection
    return `"${t.replace(/"/g, '""')}"`;
  };

  const handleExportCSV = () => {
    const headers = ["Employee ID", "Full Name", "Work Email", "Department", "Designation", "Employment Type", "Status", "Joining Date"];
    const rows = filteredEmployees.map((e) =>
      [e.employeeId, e.fullName, e.workEmail, e.departmentName, e.designationTitle, e.employmentType, e.status, e.joiningDate].map(csvCell).join(",")
    );
    const blob = new Blob(["\uFEFF" + [headers.map(csvCell).join(","), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Graapes_Employee_Directory_${todayLocal()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Employee directory exported to CSV");
  };

  const canManage = currentUser.role === "super_admin" || currentUser.role === "hr_admin";

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800">
              {currentUser.role === "department_manager" ? "My Team Members" : "Employee & Intern Directory"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {currentUser.role === "department_manager"
                ? "Departmental roster and direct reports overview."
                : "Centralized employee profiles, lifecycle records, designations, and contact details."}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="py-2 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition"
            >
              <Download size={15} /> Export CSV
            </button>
            {canManage && (
              <button
                onClick={() => { setNewEmp((n) => ({ ...n, joiningDate: n.joiningDate || todayLocal() })); setShowCreateModal(true); }}
                className="py-2 px-3.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
              >
                <UserPlus size={15} /> Add Employee
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, employee ID, or work email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Probation">Probation</option>
              <option value="Notice Period">Notice Period</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Intern">Intern</option>
            </select>
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Role & Dept</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No employees match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={emp.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                            alt={emp.fullName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"
                          />
                          <div>
                            <p className="font-semibold text-slate-900">{emp.fullName}</p>
                            <span className="text-[11px] font-mono text-emerald-700 font-medium">
                              {emp.employeeId}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-800">{emp.designationTitle}</p>
                        <p className="text-[11px] text-slate-500">{emp.departmentName}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="text-slate-700">{emp.workEmail}</p>
                        <p className="text-[11px] text-slate-500">{emp.phone}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="text-slate-700">{emp.joiningDate}</p>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {emp.employmentType}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            emp.status === "Active"
                              ? "bg-emerald-100 text-emerald-800"
                              : emp.status === "Notice Period"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              emp.status === "Active"
                                ? "bg-emerald-600"
                                : emp.status === "Notice Period"
                                ? "bg-amber-600"
                                : "bg-rose-600"
                            }`}
                          />
                          {emp.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedEmployee(emp)}
                            className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-xs transition"
                          >
                            Details
                          </button>
                          {canManage && emp.status !== "Inactive" && (
                            <button
                              onClick={() => setShowDeactivateConfirm(emp)}
                              className="py-1 px-2 text-rose-600 hover:bg-rose-50 rounded text-xs transition"
                              title="Deactivate account"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Showing {filteredEmployees.length} of {employees.length} employee records</span>
            <span className="text-[11px]">Least-privilege RBAC active: Salary & bank details protected</span>
          </div>
        </div>

        {/* Employee Detail Floating Center Modal */}
        {selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-md transition-opacity"
              onClick={() => setSelectedEmployee(null)}
            />
            <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
              <div className="p-6 bg-slate-900 text-white flex items-start justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedEmployee.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                    alt={selectedEmployee.fullName}
                    className="w-14 h-14 rounded-full border-2 border-white object-cover"
                  />
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{selectedEmployee.fullName}</h3>
                    <p className="text-xs text-emerald-400 font-mono mt-0.5">{selectedEmployee.employeeId}</p>
                    <p className="text-xs text-slate-300 mt-0.5">{selectedEmployee.designationTitle}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto text-xs text-slate-700">
                {/* Employment Section */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm border-b pb-1">Employment Information</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block">Department</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.departmentName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Employment Type</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.employmentType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Date of Joining</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.joiningDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Status</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.status}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Work Location</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.workLocation}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Reporting Manager</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.reportingManagerName || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Section */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm border-b pb-1">Contact Details</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block">Work Email</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.workEmail}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Personal Email</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.personalEmail || "Confidential / Hidden"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Phone</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Residential Address</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.address || "Bangalore, Karnataka"}</span>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm border-b pb-1">Emergency Contact</h4>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block">Name</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.emergencyContact?.name || "Not provided"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Relationship</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.emergencyContact?.relationship || "Family"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block">Phone</span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.emergencyContact?.phone || "Not provided"}</span>
                    </div>
                  </div>
                </div>

                {/* Exit details if Inactive */}
                {selectedEmployee.exitDetails && (
                  <div className="space-y-2 bg-rose-50 p-3 rounded-lg border border-rose-200">
                    <h5 className="font-bold text-rose-800">Employment Exit Record</h5>
                    <p className="text-rose-700">Resignation: {selectedEmployee.exitDetails.resignationDate || "Recorded"}</p>
                    <p className="text-rose-700">Last Working Day: {selectedEmployee.exitDetails.lastWorkingDay || "Relieved"}</p>
                    <p className="text-rose-700">Status: {selectedEmployee.exitDetails.exitStatus}</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center flex-shrink-0">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Employee Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setShowCreateModal(false)} />
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">New Employee Onboarding</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Step 1: Create profile record & assign unique Employee ID</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Employee ID (optional)</label>
                    <input
                      type="text"
                      placeholder="Auto-assigned, e.g. GRP-016"
                      value={newEmp.employeeId}
                      onChange={(e) => setNewEmp({ ...newEmp, employeeId: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={newEmp.fullName}
                      onChange={(e) => setNewEmp({ ...newEmp, fullName: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="rahul.s@graapes.com"
                      value={newEmp.workEmail}
                      onChange={(e) => setNewEmp({ ...newEmp, workEmail: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={newEmp.phone}
                      onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Department</label>
                    <select
                      value={effDeptId}
                      onChange={(e) => setNewEmp({ ...newEmp, departmentId: e.target.value, designationId: "" })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                    <select
                      value={effDesId}
                      onChange={(e) => setNewEmp({ ...newEmp, designationId: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      {deptDesignations.length === 0 && <option value="">No designations in this department</option>}
                      {deptDesignations.map((des) => (
                        <option key={des.id} value={des.id}>{des.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Reporting Manager</label>
                    <select
                      value={newEmp.reportingManagerId}
                      onChange={(e) => setNewEmp({ ...newEmp, reportingManagerId: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <option value="">— None (requests go to HR) —</option>
                      {employees.filter((m) => m.status !== "Inactive").map((m) => (
                        <option key={m.id} value={m.id}>{m.fullName} ({m.employeeId})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Employment Type</label>
                    <select
                      value={newEmp.employmentType}
                      onChange={(e) => setNewEmp({ ...newEmp, employmentType: e.target.value as EmploymentType })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <option value="Full-Time">Full-Time</option>
                      <option value="Intern">Intern</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Date of Joining</label>
                    <input
                      type="date"
                      value={newEmp.joiningDate}
                      onChange={(e) => setNewEmp({ ...newEmp, joiningDate: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="font-semibold text-slate-700 mb-2">Emergency Contact Information</p>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Contact Name"
                      value={newEmp.emergencyContact.name}
                      onChange={(e) =>
                        setNewEmp({ ...newEmp, emergencyContact: { ...newEmp.emergencyContact, name: e.target.value } })
                      }
                      className="p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Relationship (e.g. Spouse, Parent)"
                      value={newEmp.emergencyContact.relationship}
                      onChange={(e) =>
                        setNewEmp({ ...newEmp, emergencyContact: { ...newEmp.emergencyContact, relationship: e.target.value } })
                      }
                      className="p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      value={newEmp.emergencyContact.phone}
                      onChange={(e) =>
                        setNewEmp({ ...newEmp, emergencyContact: { ...newEmp.emergencyContact, phone: e.target.value } })
                      }
                      className="p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                  <span className="text-[11px] text-emerald-800">
                    A secure employee login account is created automatically, and temporary credentials are shown once after successful creation.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg font-semibold shadow-sm"
                  >
                    {creating ? "Creating..." : "Create Employee Record"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Deactivate Account Confirmation Dialog */}
        {showDeactivateConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setShowDeactivateConfirm(null)} />
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl z-10 p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Deactivate Employee</h3>
                  <p className="text-xs text-slate-500">BR-007: Prompt access revocation</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to deactivate{" "}
                <span className="font-semibold text-slate-800">{showDeactivateConfirm.fullName}</span> ({showDeactivateConfirm.employeeId})?
                The employee will lose immediate portal sign-in access. All historical attendance, leaves, and audit records will remain preserved per compliance policy.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Deactivation</label>
                <input
                  type="text"
                  placeholder="e.g. Resigned / End of Contract"
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowDeactivateConfirm(null)}
                  className="py-1.5 px-3 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deactivateEmployee(showDeactivateConfirm.id, deactivateReason);
                    setShowDeactivateConfirm(null);
                    setDeactivateReason("");
                  }}
                  className="py-1.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Confirm Deactivation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Employee onboarding credentials */}
      {credentials && (
        <div className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Employee Created Successfully</h3>
                <p className="text-xs text-slate-500 mt-1">Save or send these credentials now. The temporary password will not be shown again.</p>
              </div>
              <button onClick={() => setCredentials(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-900">{credentials.name}</p>
                <div><p className="text-[11px] uppercase tracking-wide text-slate-500">Email</p><p className="text-sm font-medium text-slate-800 break-all">{credentials.email}</p></div>
                <div><p className="text-[11px] uppercase tracking-wide text-slate-500">Temporary Password</p><code className="inline-block mt-1 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-200 text-sm font-bold text-slate-900">{credentials.password}</code></div>
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">The employee will be required to change this password on first login.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button type="button" onClick={copyCredentials} className="py-2.5 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-slate-50">Copy Credentials</button>
                <button type="button" onClick={openGmailCompose} className="py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2"><Mail size={16}/> Open Gmail & Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AppShell>
  );
}
