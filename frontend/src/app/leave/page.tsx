"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useHRMS } from "@/context/hrms-context";
import { LeaveRequest, LeaveTypeCode } from "@/types";
import {
  CalendarDays,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  History,
  AlertTriangle,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";

export default function LeavePage() {
  const { currentUser, leaveRequests, leaveBalances, submitLeaveRequest, reviewLeaveRequest, cancelLeaveRequest } = useHRMS();

  const [activeTab, setActiveTab] = useState<"balances" | "applications" | "approvals">("balances");
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<LeaveRequest | null>(null);

  // New Leave Application Form State
  const [leaveTypeCode, setLeaveTypeCode] = useState<LeaveTypeCode>("CL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  React.useEffect(() => {
    const t = format(new Date(), "yyyy-MM-dd");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartDate(t);
    setEndDate(t);
  }, []);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const balances = leaveBalances;
  const leaveTypes: { code: LeaveTypeCode; name: string }[] = [
    ...balances.map((b) => ({ code: b.leaveTypeCode, name: b.leaveTypeName })),
    // Unpaid leave (LWP) has no quota/balance row on the server, so it is never in the balances list.
    ...(balances.some((b) => b.leaveTypeCode === "UNPAID") ? [] : [{ code: "UNPAID" as LeaveTypeCode, name: "Loss of Pay (LWP)" }]),
  ];
  const myEmpId = currentUser.employeeId ?? "";

  const canApprove =
    currentUser.role === "super_admin" ||
    currentUser.role === "hr_admin" ||
    currentUser.role === "department_manager";

  // Filter requests
  const myRequests = leaveRequests.filter((l) => l.employeeId === myEmpId);
  // You can never review your own request (the API refuses it), so keep it out of the queue.
  const pendingApprovals = leaveRequests.filter((l) => l.status === "Pending" && l.employeeId !== myEmpId);

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please specify a reason for leave");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Please choose the leave dates");
      return;
    }
    if (endDate < startDate) {
      toast.error("End date cannot be before start date");
      return;
    }
    if (isHalfDay && startDate !== endDate) {
      toast.error("A half-day request must be for a single date");
      return;
    }

    const selectedTypeObj = leaveTypes.find((t) => t.code === leaveTypeCode);
    setSubmitting(true);
    // Working days, holidays and the approver are decided by the server - only the intent is sent.
    const ok = await submitLeaveRequest({
      employeeId: myEmpId,
      employeeName: currentUser.name,
      leaveTypeCode,
      leaveTypeName: selectedTypeObj?.name || leaveTypeCode,
      startDate,
      endDate,
      durationDays: 0,
      isHalfDay,
      reason: reason.trim(),
    });
    setSubmitting(false);

    if (ok) {
      setShowApplyModal(false);
      setReason("");
      setIsHalfDay(false);
    }
  };

  // Approving needs no note; rejecting needs a real reason from the approver.
  const handleReject = (id: string) => {
    const notes = window.prompt("Reason for rejecting this leave request (required):")?.trim();
    if (!notes) { toast.error("A reason is required to reject a request"); return; }
    reviewLeaveRequest(id, "Rejected", notes);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800">
              {currentUser.role === "employee" ? "My Leave Portal" : "Leave Management & Approvals"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Apply for leave, track balances, review employee requests, and maintain decision audit trails.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowApplyModal(true)}
              className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <Plus size={15} /> Apply for Leave
            </button>
          </div>
        </div>


        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("balances")}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === "balances"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Leave Balances
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === "applications"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {currentUser.role === "employee" ? `My Requests History (${myRequests.length})` : `Company Leave Log (${leaveRequests.length})`}
          </button>
          {canApprove && (
            <button
              onClick={() => setActiveTab("approvals")}
              className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === "approvals"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Approval Queue ({pendingApprovals.length})
              {pendingApprovals.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          )}
        </div>

        {/* Tab 1: Balances */}
        {activeTab === "balances" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances.map((bal) => (
              <div key={bal.leaveTypeCode} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">
                      {bal.leaveTypeCode}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Total: {bal.totalQuota} Days
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mt-3">{bal.leaveTypeName}</h3>
                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-extrabold text-slate-900">{bal.available}</span>
                      <span className="text-xs text-slate-500 ml-1">Days Left</span>
                    </div>
                    <span className="text-xs font-medium text-amber-600">
                      {bal.consumed} Used
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Pending review: {bal.pendingApproval}d</span>
                  <button
                    onClick={() => {
                      setLeaveTypeCode(bal.leaveTypeCode);
                      setShowApplyModal(true);
                    }}
                    className="text-emerald-600 font-semibold hover:underline"
                  >
                    Apply Now →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Requests Table */}
        {activeTab === "applications" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-3 px-4">Applicant</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(currentUser.role === "employee" ? myRequests : leaveRequests).map((lr) => (
                    <tr key={lr.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-800">{lr.employeeName}</td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700">{lr.leaveTypeName}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{lr.leaveTypeCode}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {lr.startDate} to {lr.endDate}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{lr.durationDays} Day(s)</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{lr.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lr.status === "Approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : lr.status === "Rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {lr.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {lr.status === "Pending" && lr.employeeId === myEmpId && (
                            <button
                              onClick={() => { if (window.confirm("Cancel this pending leave request?")) cancelLeaveRequest(lr.id); }}
                              className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-semibold text-xs transition"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedRequestDetails(lr)}
                            className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-xs transition"
                          >
                            Timeline
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Approvals Queue */}
        {activeTab === "approvals" && canApprove && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Leave Category</th>
                    <th className="py-3 px-4">Requested Dates</th>
                    <th className="py-3 px-4">Reason Statement</th>
                    <th className="py-3 px-4">Applied Date</th>
                    <th className="py-3 px-4 text-right">Manager Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingApprovals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        All leave requests have been actioned. No pending approvals in queue.
                      </td>
                    </tr>
                  ) : (
                    pendingApprovals.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{req.employeeName}</p>
                          <span className="text-[10px] font-mono text-slate-400">{req.employeeId}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-800">{req.leaveTypeName}</span>
                          <span className="block text-[11px] text-slate-500 font-semibold">{req.durationDays} day(s)</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {req.startDate} to {req.endDate}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs">{req.reason}</td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">{req.appliedOn}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => reviewLeaveRequest(req.id, "Approved")}
                              className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs transition shadow-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="py-1 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-bold text-xs transition"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Apply Leave Modal */}
        {showApplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setShowApplyModal(false)} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl z-10 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200/80">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-base text-slate-900">Submit Leave Application</h3>
                <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleApplySubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Leave Type</label>
                  <select
                    value={leaveTypeCode}
                    onChange={(e) => setLeaveTypeCode(e.target.value as LeaveTypeCode)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {leaveTypes.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                    <CustomDatePicker
                      value={startDate}
                      onChange={(date) => { setStartDate(date); if (isHalfDay || endDate < date) setEndDate(date); }}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                    <CustomDatePicker
                      value={endDate}
                      onChange={(date) => setEndDate(date)}
                      align="right"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-slate-700 font-medium">
                  <input type="checkbox" checked={isHalfDay} onChange={(e) => { setIsHalfDay(e.target.checked); if (e.target.checked) setEndDate(startDate); }} />
                  Half-day (single date only)
                </label>
                <p className="text-[11px] text-slate-500 -mt-2">
                  Duration is calculated automatically from working days (weekends and company holidays are excluded).
                </p>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason for Leave *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide specific details for managerial review..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="py-2 px-4 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Approval Timeline Modal */}
        {selectedRequestDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setSelectedRequestDetails(null)} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150 border border-slate-200/80">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-sm text-slate-900">Leave Decision Timeline</h3>
                <button onClick={() => setSelectedRequestDetails(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <p>
                  <span className="font-semibold text-slate-700">Applicant:</span> {selectedRequestDetails.employeeName}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Dates:</span> {selectedRequestDetails.startDate} to {selectedRequestDetails.endDate} ({selectedRequestDetails.durationDays}d)
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Reason:</span> {selectedRequestDetails.reason}
                </p>
              </div>

              <div className="pt-3 border-t">
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                  <History size={15} /> Audit Log & Actions
                </h4>
                <div className="space-y-3 pl-3 border-l-2 border-emerald-500">
                  {selectedRequestDetails.history.map((h, i) => (
                    <div key={i} className="text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{h.action}</span>
                        <span className="text-[10px] text-slate-400">{h.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">By {h.actor}</p>
                      {h.comment && <p className="text-[11px] italic bg-slate-50 p-1.5 rounded mt-1">&quot;{h.comment}&quot;</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedRequestDetails(null)}
                  className="py-1.5 px-4 bg-slate-200 text-slate-800 rounded-lg font-semibold"
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
