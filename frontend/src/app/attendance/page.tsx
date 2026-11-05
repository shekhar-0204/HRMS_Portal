"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useHRMS } from "@/context/hrms-context";
import { AttendanceRecord, AttendanceCorrectionRequest } from "@/types";
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileEdit,
  Check,
  X,
  Clock3,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO } from "date-fns";

const localISO = (d: Date) => format(d, "yyyy-MM-dd");

export default function AttendancePage() {
  const {
    currentUser,
    attendanceRecords,
    correctionRequests,
    holidays,
    leaveRequests,
    recordCheckIn,
    recordCheckOut,
    recordBackdatedAttendance,
    submitAttendanceCorrection,
    reviewAttendanceCorrection,
  } = useHRMS();

  const [activeTab, setActiveTab] = useState<"calendar" | "records" | "corrections">("calendar");
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showBackdateModal, setShowBackdateModal] = useState(false);
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<AttendanceRecord | null>(null);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Backdate Punch Form State
  const [backdateDate, setBackdateDate] = useState("");
  const [backdateCheckIn, setBackdateCheckIn] = useState("09:30 AM");
  const [backdateCheckOut, setBackdateCheckOut] = useState("06:30 PM");
  const [backdateReason, setBackdateReason] = useState("");

  // Correction Form State
  const [requestedCheckIn, setRequestedCheckIn] = useState("09:30 AM");
  const [requestedCheckOut, setRequestedCheckOut] = useState("06:30 PM");
  const [correctionReason, setCorrectionReason] = useState("");
  const [todayStr, setTodayStr] = useState("");

  // "Now" must be read on the client after hydration (Cache Components forbids new Date() while prerendering).
  React.useEffect(() => {
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentMonth(now);
    setBackdateDate(localISO(now));
    setTodayStr(localISO(now));
  }, []);

  const myEmpId = currentUser.employeeId ?? "";
  const myRecordToday = attendanceRecords.find((r) => r.employeeId === myEmpId && r.date === todayStr);
  const canApprove = currentUser.role === "super_admin" || currentUser.role === "hr_admin" || currentUser.role === "department_manager";

  // Filter records based on role
  const displayedRecords = attendanceRecords.filter((rec) => {
    if (currentUser.role === "employee") {
      return rec.employeeId === myEmpId;
    }
    return true;
  });

  const displayedCorrections = correctionRequests.filter((c) => {
    if (currentUser.role === "employee") {
      return c.employeeId === myEmpId;
    }
    return true;
  });

  // Calendar days generation
  const calendarMonth = currentMonth ?? new Date(2026, 0, 1);
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOffset = getDay(monthStart); // 0 (Sun) to 6 (Sat)

  // Month KPIs computed from real data (own records for the month on screen)
  const monthKey = format(calendarMonth, "yyyy-MM");
  const myMonthRecords = attendanceRecords.filter((r) => r.employeeId === myEmpId && r.date.startsWith(monthKey));
  const workingDaysInMonth = daysInMonth.filter((d) => {
    const dow = getDay(d);
    const ds = format(d, "yyyy-MM-dd");
    return dow !== 0 && dow !== 6 && !holidays.some((h) => h.date === ds && !h.isOptional);
  }).length;
  const presentOnTime = myMonthRecords.filter((r) => r.status === "Present").length;
  const lateDays = myMonthRecords.filter((r) => r.status === "Late").length;
  const attendedDays = myMonthRecords.filter((r) => ["Present", "Late", "Half-Day"].includes(r.status)).length;
  const holidayDays = holidays.filter((h) => h.date.startsWith(monthKey)).length;
  const weekendDays = daysInMonth.filter((d) => getDay(d) === 0 || getDay(d) === 6).length;

  // Status Helper for each calendar date
  const getDayAttendanceInfo = (dateStr: string) => {
    // 1. Holiday check
    const holiday = holidays.find((h) => h.date === dateStr);
    if (holiday) {
      return { type: "holiday", label: holiday.name, color: "bg-purple-100 text-purple-800 border-purple-300" };
    }

    // 2. Approved / Pending Leave check
    const leave = leaveRequests.find(
      (l) => l.employeeId === myEmpId && l.status === "Approved" && dateStr >= l.startDate && dateStr <= l.endDate
    );
    if (leave) {
      return { type: "leave", label: `Leave (${leave.leaveTypeCode})`, color: "bg-amber-100 text-amber-800 border-amber-300" };
    }

    // 3. Attendance check
    const record = attendanceRecords.find((r) => r.employeeId === myEmpId && r.date === dateStr);
    if (record) {
      if (record.status === "Present") {
        return { type: "present", label: `Present (${record.checkIn || ""} - ${record.checkOut || ""})`, color: "bg-emerald-100 text-emerald-800 border-emerald-300", record };
      }
      if (record.status === "Late") {
        return { type: "late", label: `Late (${record.checkIn || ""})`, color: "bg-orange-100 text-orange-800 border-orange-300", record };
      }
      if (record.status === "Half-Day") {
        return { type: "present", label: `Half-Day (${record.checkIn || ""} - ${record.checkOut || ""})`, color: "bg-sky-100 text-sky-800 border-sky-300", record };
      }
      if (record.status === "Absent") {
        return { type: "absent", label: "Absent", color: "bg-rose-100 text-rose-800 border-rose-300", record };
      }
    }

    // 4. Weekend check
    const dayOfWeek = getDay(parseISO(dateStr));
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { type: "weekend", label: "Weekend", color: "bg-slate-100 text-slate-500 border-slate-200" };
    }

    // 5. Unrecorded past working day (Can be filled!)
    if (dateStr < todayStr) {
      return { type: "missed", label: "Missed Punch (Click to Add)", color: "bg-amber-50/60 text-amber-700 border-dashed border-amber-300", canBackdate: true };
    }

    return { type: "upcoming", label: "Working Day", color: "bg-white text-slate-400 border-slate-200" };
  };

  const handleOpenCorrection = (record: AttendanceRecord) => {
    setSelectedRecordForCorrection(record);
    setRequestedCheckIn(record.checkIn || "09:30 AM");
    setRequestedCheckOut(record.checkOut || "06:30 PM");
    setCorrectionReason("");
    setShowCorrectionModal(true);
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForCorrection || !correctionReason) {
      toast.error("Please explain the reason for the punch correction");
      return;
    }

    const ok = await submitAttendanceCorrection({
      employeeId: selectedRecordForCorrection.employeeId,
      employeeName: selectedRecordForCorrection.employeeName,
      date: selectedRecordForCorrection.date,
      originalCheckIn: selectedRecordForCorrection.checkIn || "--:--",
      originalCheckOut: selectedRecordForCorrection.checkOut || "--:--",
      requestedCheckIn,
      requestedCheckOut,
      reason: correctionReason,
    });

    if (ok) setShowCorrectionModal(false);
  };

  const handleBackdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backdateDate || !backdateReason) {
      toast.error("Please provide date and reason for past punch entry");
      return;
    }

    const ok = await recordBackdatedAttendance(backdateDate, backdateCheckIn, backdateCheckOut, backdateReason);
    if (ok) {
      setShowBackdateModal(false);
      setBackdateReason("");
    }
  };

  // Reviewer must give a real reason when rejecting (the API requires one).
  const handleReject = (id: string) => {
    const notes = window.prompt("Reason for rejecting this correction (required):")?.trim();
    if (!notes) { toast.error("A reason is required to reject a correction"); return; }
    reviewAttendanceCorrection(id, "Rejected", notes);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header - Minimal Clean SaaS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{currentUser.role === "employee" ? "My Attendance" : "Attendance Management"}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium border border-blue-100">
                {format(calendarMonth, "MMMM yyyy")}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {currentUser.role === "employee"
                ? "Track daily working hours, punch records, missed check-ins, and corrections."
                : "Monitor department attendance, approve punch corrections, and track compliance."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentUser.employeeId && (
              <>
                <button
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setBackdateDate(localISO(yesterday));
                    setShowBackdateModal(true);
                  }}
                  className="py-2 px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs flex items-center gap-1.5 transition"
                  title="Add attendance for a previous working day if forgotten"
                >
                  <PlusCircle size={15} className="text-blue-600" /> Log Past Punch
                </button>

                {!myRecordToday?.checkIn ? (
                  <button
                    onClick={recordCheckIn}
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center gap-1.5"
                  >
                    <Clock size={15} /> Check-In Today
                  </button>
                ) : !myRecordToday?.checkOut ? (
                  <button
                    onClick={recordCheckOut}
                    className="py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <Clock size={15} /> Check-Out
                  </button>
                ) : (
                  <span className="py-2 px-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600" /> Completed Today
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Minimal Pastel Metric Chips matching dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Working Days</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{workingDaysInMonth} Days</p>
              <p className="text-[10px] text-slate-400 mt-0.5">In {format(calendarMonth, "MMMM")}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar size={18} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Present & On Time</p>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">{presentOnTime} Days</p>
              <p className="text-[10px] text-emerald-600/80 mt-0.5 font-medium">{workingDaysInMonth ? ((attendedDays / workingDaysInMonth) * 100).toFixed(1) : "0.0"}% Attendance</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Late Punches</p>
              <p className="text-lg font-bold text-amber-600 mt-0.5">{lateDays} {lateDays === 1 ? "Day" : "Days"}</p>
              <p className="text-[10px] text-amber-600/80 mt-0.5">After 09:45 AM</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock3 size={18} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Holidays & Off</p>
              <p className="text-lg font-bold text-purple-600 mt-0.5">{holidayDays + weekendDays} Days</p>
              <p className="text-[10px] text-purple-600/80 mt-0.5">{weekendDays} weekend + {holidayDays} holiday</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
          </div>
        </div>

        {/* Tab Switcher - Clean Pill Style */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <button
            onClick={() => setActiveTab("calendar")}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "calendar"
                ? "bg-blue-50 text-blue-600 font-bold shadow-2xs border border-blue-100/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Calendar size={14} /> Attendance Calendar
          </button>
          <button
            onClick={() => setActiveTab("records")}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "records"
                ? "bg-blue-50 text-blue-600 font-bold shadow-2xs border border-blue-100/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Daily Logs ({displayedRecords.length})
          </button>
          <button
            onClick={() => setActiveTab("corrections")}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "corrections"
                ? "bg-blue-50 text-blue-600 font-bold shadow-2xs border border-blue-100/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Correction Requests ({displayedCorrections.length})
            {displayedCorrections.some((c) => c.status === "Pending") && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Tab 1: Visual Attendance Calendar */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar Grid (2 cols) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
                {/* Calendar Navigation Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      {format(calendarMonth, "MMMM yyyy")}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Click any date to view punch logs or submit correction</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition border border-slate-200"
                      title="Previous month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentMonth(new Date())}
                      className="py-1 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setCurrentMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition border border-slate-200"
                      title="Next month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                    <div
                      key={day}
                      className={`text-[11px] font-semibold py-1 uppercase tracking-wider ${
                        idx === 0 || idx === 6 ? "text-rose-500/80" : "text-slate-400"
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: startDayOffset }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-16 sm:h-20 rounded-xl bg-slate-50/40 border border-transparent" />
                  ))}

                  {daysInMonth.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const info = getDayAttendanceInfo(dateStr);
                    const isToday = dateStr === todayStr;
                    const isSelected = selectedCalendarDate === dateStr;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => {
                          setSelectedCalendarDate(dateStr);
                          if (info.canBackdate) {
                            setBackdateDate(dateStr);
                            setShowBackdateModal(true);
                          } else if (info.record) {
                            handleOpenCorrection(info.record);
                          }
                        }}
                        className={`h-16 sm:h-20 p-1.5 sm:p-2 rounded-xl text-left flex flex-col justify-between transition border relative group ${
                          isSelected
                            ? "ring-2 ring-blue-500 shadow-xs z-10"
                            : "hover:border-slate-300"
                        } ${
                          info.type === "present"
                            ? "bg-[#f0fdf4]/80 border-emerald-100/90 text-emerald-900"
                            : info.type === "holiday"
                            ? "bg-[#faf5ff]/80 border-purple-100/90 text-purple-900"
                            : info.type === "leave"
                            ? "bg-[#fffbeb]/80 border-amber-100/90 text-amber-900"
                            : info.type === "missed"
                            ? "bg-[#fff1f2]/70 border-dashed border-rose-200 text-rose-700"
                            : info.type === "weekend"
                            ? "bg-slate-50/60 border-slate-100 text-slate-400"
                            : "bg-white border-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${
                              isToday ? "bg-blue-600 text-white shadow-2xs font-bold" : ""
                            }`}
                          >
                            {format(day, "d")}
                          </span>

                          {info.type === "present" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                          {info.type === "holiday" && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                          {info.type === "leave" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                          {info.type === "missed" && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
                        </div>

                        <div className="w-full truncate mt-1">
                          <span className="block text-[9px] sm:text-[10px] font-semibold truncate leading-tight">
                            {info.type === "present"
                              ? info.record?.checkIn || "Present"
                              : info.type === "holiday"
                              ? info.label.split(" ")[0]
                              : info.type === "leave"
                              ? "On Leave"
                              : info.type === "missed"
                              ? "Missed"
                              : info.type === "weekend"
                              ? "Weekend"
                              : "Working"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Minimal Legend */}
                <div className="flex flex-wrap items-center gap-4 pt-5 mt-5 border-t border-slate-100 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Legend:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Present (Punch Logged)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span>Company Holiday</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Approved Leave</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span>Missed Punch (Click to Add)</span>
                  </div>
                </div>
              </div>

              {/* Right Side Inspector & Quick Actions (1 col) */}
              <div className="space-y-6">
                {/* Selected Date Inspector Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
                  <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
                    <span>Date Details</span>
                    {selectedCalendarDate && (
                      <span className="text-[11px] font-mono text-slate-400">
                        {format(parseISO(selectedCalendarDate), "dd MMM yyyy")}
                      </span>
                    )}
                  </h3>

                  {(() => {
                    const info = selectedCalendarDate ? getDayAttendanceInfo(selectedCalendarDate) : null;
                    const rec = selectedCalendarDate
                      ? attendanceRecords.find((r) => r.employeeId === myEmpId && r.date === selectedCalendarDate)
                      : null;

                    return (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">Day Status</span>
                            <span className="text-xs font-bold text-slate-800 capitalize">
                              {info?.type || "Standard Working Day"}
                            </span>
                          </div>

                          {rec ? (
                            <>
                              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                                <span className="text-slate-500">Check-In:</span>
                                <span className="font-mono font-semibold text-slate-800">{rec.checkIn || "--:--"}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Check-Out:</span>
                                <span className="font-mono font-semibold text-slate-800">{rec.checkOut || "--:--"}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Duration:</span>
                                <span className="font-mono font-semibold text-emerald-600">{rec.workDurationHours ? `${rec.workDurationHours} hrs` : "-"}</span>
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-slate-500 pt-1">
                              {info?.label || "No attendance record found for this date."}
                            </p>
                          )}
                        </div>

                        {rec && currentUser.role === "employee" && (
                          <button
                            onClick={() => handleOpenCorrection(rec)}
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                          >
                            Request Punch Correction
                          </button>
                        )}

                        {info?.canBackdate && currentUser.role === "employee" && (
                          <button
                            onClick={() => {
                              setBackdateDate(selectedCalendarDate || todayStr);
                              setShowBackdateModal(true);
                            }}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition shadow-xs"
                          >
                            + Fill Missed Attendance
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Backdated Missed Punch Callout Box */}
                <div className="p-4 bg-[#f0f6ff]/70 border border-blue-100 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Missed Yesterday&apos;s Punch?</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        You can request a correction for any working day in the last 30 days. Your manager approves it.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Attendance Log Table */}
        {activeTab === "records" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">In Time</th>
                    <th className="py-3 px-4">Out Time</th>
                    <th className="py-3 px-4">Total Hrs</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Source / Note</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedRecords.map((rec) => {
                    const isMissingOut = rec.checkIn && !rec.checkOut && rec.date !== todayStr;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{rec.date}</td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">{rec.employeeName}</p>
                          <span className="text-[10px] font-mono text-slate-400">{rec.employeeId}</span>
                        </td>
                        <td className="py-3 px-4 font-mono">{rec.checkIn || "--:--"}</td>
                        <td className="py-3 px-4 font-mono">
                          {rec.checkOut ? (
                            rec.checkOut
                          ) : isMissingOut ? (
                            <span className="text-amber-600 font-semibold flex items-center gap-1">
                              <AlertCircle size={12} /> Missing Punch
                            </span>
                          ) : (
                            "--:--"
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">{rec.workDurationHours ? `${rec.workDurationHours}h` : "-"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rec.status === "Present"
                                ? "bg-emerald-100 text-emerald-800"
                                : rec.status === "Late"
                                ? "bg-amber-100 text-amber-800"
                                : rec.status === "Half-Day"
                                ? "bg-sky-100 text-sky-800"
                                : rec.status === "Leave"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          <span>{rec.source}</span>
                          {rec.notes && <p className="text-[10px] text-slate-400 italic truncate max-w-xs">{rec.notes}</p>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {currentUser.role === "employee" && (
                            <button
                              onClick={() => handleOpenCorrection(rec)}
                              className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
                            >
                              Request Correction
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Correction Requests & Approvals */}
        {activeTab === "corrections" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Original Punches</th>
                    <th className="py-3 px-4">Requested Punches</th>
                    <th className="py-3 px-4">Reason Given</th>
                    <th className="py-3 px-4">Status</th>
                    {canApprove && <th className="py-3 px-4 text-right">Approvals</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedCorrections.map((corr) => (
                    <tr key={corr.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-medium">{corr.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{corr.employeeName}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {corr.originalCheckIn} → {corr.originalCheckOut}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        {corr.requestedCheckIn} → {corr.requestedCheckOut}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">{corr.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            corr.status === "Approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : corr.status === "Rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {corr.status}
                        </span>
                        {corr.reviewedBy && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">By {corr.reviewedBy}</span>
                        )}
                      </td>
                      {canApprove && (
                        <td className="py-3 px-4 text-right">
                          {corr.status === "Pending" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => reviewAttendanceCorrection(corr.id, "Approved")}
                                className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(corr.id)}
                                className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-semibold text-xs transition"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Completed</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Log Past Day / Missed Punch */}
        {showBackdateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setShowBackdateModal(false)} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl z-10 p-6 space-y-4 border border-slate-200/80">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock3 size={18} className="text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">Log Past Attendance</h3>
                </div>
                <button onClick={() => setShowBackdateModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Forgot to check in or out on a previous working day? Log your working hours here. This is sent to your manager as a correction request and appears on your calendar once approved (last 30 days only).
              </p>

              <form onSubmit={handleBackdateSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Missed Date *</label>
                  <input
                    type="date"
                    required
                    max={todayStr}
                    value={backdateDate}
                    onChange={(e) => setBackdateDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-blue-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">In Time</label>
                    <input
                      type="text"
                      required
                      placeholder="09:30 AM"
                      value={backdateCheckIn}
                      onChange={(e) => setBackdateCheckIn(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Out Time</label>
                    <input
                      type="text"
                      required
                      placeholder="06:30 PM"
                      value={backdateCheckOut}
                      onChange={(e) => setBackdateCheckOut(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason for Past Entry *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Forgot web punch due to client site meeting."
                    value={backdateReason}
                    onChange={(e) => setBackdateReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 transition"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBackdateModal(false)}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs transition"
                  >
                    Save Attendance
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Correction Request */}
        {showCorrectionModal && selectedRecordForCorrection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setShowCorrectionModal(false)} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl z-10 p-6 space-y-4 border border-slate-200/80">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900">Attendance Correction Request</h3>
                <button onClick={() => setShowCorrectionModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                  <X size={16} />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                <p>
                  <span className="font-semibold text-slate-700">Date:</span> {selectedRecordForCorrection.date}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-slate-700">Original Punch:</span> In: {selectedRecordForCorrection.checkIn || "--:--"} | Out: {selectedRecordForCorrection.checkOut || "--:--"}
                </p>
              </div>

              <form onSubmit={handleCorrectionSubmit} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Corrected In Time</label>
                    <input
                      type="text"
                      required
                      placeholder="09:30 AM"
                      value={requestedCheckIn}
                      onChange={(e) => setRequestedCheckIn(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Corrected Out Time</label>
                    <input
                      type="text"
                      required
                      placeholder="06:30 PM"
                      value={requestedCheckOut}
                      onChange={(e) => setRequestedCheckOut(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason for Punch Adjustment *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Explain reason for punch correction..."
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 transition"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionModal(false)}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs transition"
                  >
                    Submit to Manager
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
