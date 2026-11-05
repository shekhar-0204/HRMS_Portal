"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useHRMS } from "@/context/hrms-context";
import {
  Users,
  Clock,
  CalendarCheck2,
  CalendarDays,
  CheckCircle,
  Clock3,
  AlertCircle,
  FileText,
  Building2,
  ArrowUpRight,
  TrendingUp,
  Megaphone,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Info,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const {
    currentUser,
    employees,
    attendanceRecords,
    leaveRequests,
    correctionRequests,
    holidays,
    announcements,
    recordCheckIn,
    recordCheckOut,
  } = useHRMS();

  const [todayStr, setTodayStr] = useState("");
  const [activeLeaveMenu, setActiveLeaveMenu] = useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setTodayStr(format(new Date(), "yyyy-MM-dd"));
    }, 0);
    const closeMenu = () => setActiveLeaveMenu(null);
    window.addEventListener("click", closeMenu);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", closeMenu);
    };
  }, []);

  // Specific metrics based on current role
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === "Active").length;
  const internsCount = employees.filter((e) => e.employmentType === "Intern" && e.status !== "Inactive").length;

  const todayPunches = attendanceRecords.filter((a) => a.date === todayStr);
  const presentCount = todayPunches.filter((a) => a.status === "Present" || a.status === "Late").length;
  const lateCount = todayPunches.filter((a) => a.status === "Late").length;
  const myCode = currentUser.employeeId ?? "";
  // own requests cannot be self-approved, so they are not "pending approvals"
  const pendingLeaves = leaveRequests.filter((l) => l.status === "Pending" && l.employeeId !== myCode);
  const pendingCorrections = correctionRequests.filter((c) => c.status === "Pending" && c.employeeId !== myCode);

  // Manager specific team filter
  const myTeam = employees.filter((e) => e.departmentId === currentUser.departmentId || e.reportingManagerId === currentUser.employeeId);
  const myTeamPendingLeaves = pendingLeaves.filter((l) => myTeam.some((m) => m.employeeId === l.employeeId));
  const myTeamPendingCorrections = pendingCorrections.filter((c) => myTeam.some((m) => m.employeeId === c.employeeId));

  // Employee specific records
  const myTodayAttendance = attendanceRecords.find((a) => a.employeeId === (currentUser.employeeId ?? "") && a.date === todayStr);
  const isCheckedIn = Boolean(myTodayAttendance?.checkIn);
  const isCheckedOut = Boolean(myTodayAttendance?.checkOut);
  const myLeaves = leaveRequests.filter((l) => l.employeeId === (currentUser.employeeId ?? ""));

  const upcomingHolidays = holidays.filter((h) => h.date >= todayStr).slice(0, 3);
  const latestAnnouncements = announcements.slice(0, 3);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Minimal Clean Header matching reference */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
              Welcome Back, {currentUser.name}
            </h2>
            <p className="text-xs sm:text-sm font-semibold mt-0.5 text-slate-600 dark:text-slate-300">
              Manage your leave and track your time off
            </p>
          </div>

          {/* Clean Quick Attendance Action for Employee */}
          {currentUser.role === "employee" && (
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  isCheckedOut ? "bg-slate-400" : isCheckedIn ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                )} />
                <span className="text-xs font-medium text-slate-700">
                  {isCheckedOut
                    ? "Checked Out"
                    : isCheckedIn
                    ? `Working • ${myTodayAttendance?.checkIn}`
                    : "Not Checked In"}
                </span>
              </div>
              {!isCheckedIn ? (
                <button
                  onClick={recordCheckIn}
                  className="py-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                >
                  Check In
                </button>
              ) : !isCheckedOut ? (
                <button
                  onClick={recordCheckOut}
                  className="py-1.5 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold transition"
                >
                  Check Out
                </button>
              ) : (
                <span className="text-xs text-slate-400 font-medium px-2">Completed</span>
              )}
            </div>
          )}
        </div>

        {/* Conditional Layout: Employee matches Reference Image, Admin matches Enterprise Grid */}
        {currentUser.role === "employee" ? (
          <div className="space-y-6">
            {/* Row 1: Leave Summary (Left) & Today Status (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Leave Summary (2 cols) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-slate-800 text-base">Leave Summary</h3>
                  <Link
                    href="/leave"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    View All
                  </Link>
                </div>                {/* 2x2 Minimal Corporate Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Annual / Privilege Leave */}
                  <div className="bg-slate-100/80 hover:bg-slate-100 border border-slate-300/80 rounded-xl p-4 flex items-start justify-between transition group shadow-xs relative">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100/90 text-blue-700 border border-blue-200/80 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                        <CalendarDays size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Annual Leave</p>
                        <p className="text-base font-bold text-slate-900 mt-0.5">10/18</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">days remaining</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLeaveMenu(activeLeaveMenu === "annual" ? null : "annual");
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
                        title="Leave Options"
                      >
                        <MoreVertical size={15} />
                      </button>
                      {activeLeaveMenu === "annual" && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 z-30 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <Link
                            href="/leave?type=Annual"
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            <CalendarDays size={14} className="text-blue-600" />
                            <span>Apply Annual Leave</span>
                          </Link>
                          <Link
                            href="/leave"
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            <Eye size={14} className="text-slate-500" />
                            <span>View Balance & History</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sick Leave */}
                  <div className="bg-slate-100/80 hover:bg-slate-100 border border-slate-300/80 rounded-xl p-4 flex items-start justify-between transition group shadow-xs relative">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100/90 text-amber-700 border border-amber-200/80 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                        <Clock size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Sick Leave</p>
                        <p className="text-base font-bold text-slate-900 mt-0.5">8/10</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">days remaining</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLeaveMenu(activeLeaveMenu === "sick" ? null : "sick");
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
                        title="Leave Options"
                      >
                        <MoreVertical size={15} />
                      </button>
                      {activeLeaveMenu === "sick" && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 z-30 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <Link
                            href="/leave?type=Sick"
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            <Clock size={14} className="text-amber-600" />
                            <span>Apply Sick Leave</span>
                          </Link>
                          <Link
                            href="/leave"
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            <Eye size={14} className="text-slate-500" />
                            <span>View Balance & History</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Casual Leave */}
                  <div className="bg-slate-100/80 hover:bg-slate-100 border border-slate-300/80 rounded-xl p-4 flex items-start justify-between transition group shadow-xs relative">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100/90 text-emerald-700 border border-emerald-200/80 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                        <CalendarCheck2 size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Casual Leave</p>
                        <p className="text-base font-bold text-slate-900 mt-0.5">7/12</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">days remaining</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLeaveMenu(activeLeaveMenu === "casual" ? null : "casual");
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
                        title="Leave Options"
                      >
                        <MoreVertical size={15} />
                      </button>
                      {activeLeaveMenu === "casual" && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 z-30 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <Link
                            href="/leave?type=Casual"
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            <CalendarCheck2 size={14} className="text-emerald-600" />
                            <span>Apply Casual Leave</span>
                          </Link>
                          <Link
                            href="/leave"
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            <Eye size={14} className="text-slate-500" />
                            <span>View Balance & History</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Unpaid / Extra Leave */}
                  <div className="bg-slate-100/80 hover:bg-slate-100 border border-slate-300/80 rounded-xl p-4 flex items-start justify-between transition group shadow-xs relative">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-rose-100/90 text-rose-700 border border-rose-200/80 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Unpaid Leave</p>
                        <p className="text-base font-bold text-slate-900 mt-0.5">Available</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">When needed</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLeaveMenu(activeLeaveMenu === "unpaid" ? null : "unpaid");
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
                        title="Leave Options"
                      >
                        <MoreVertical size={15} />
                      </button>
                      {activeLeaveMenu === "unpaid" && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 z-30 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <Link
                            href="/leave?type=Unpaid"
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            <FileText size={14} className="text-rose-600" />
                            <span>Apply Unpaid Leave</span>
                          </Link>
                          <Link
                            href="/leave"
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            <Eye size={14} className="text-slate-500" />
                            <span>View Balance & History</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary Button */}
                <div className="mt-5">
                  <Link
                    href="/leave"
                    className="inline-flex items-center gap-1.5 py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                  >
                    Apply Leave
                  </Link>
                </div>
              </div>

              {/* Today Status (1 col - matching reference) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-base mb-5">Today Status</h3>
                  <div className="space-y-4">
                    {/* Status item 1 */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                        <CheckCircle size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Status</p>
                        <p className="text-xs font-bold text-slate-800">
                          {isCheckedIn ? "Working from Office" : "Awaiting Check-in"}
                        </p>
                      </div>
                    </div>

                    {/* Status item 2 */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                        <Clock size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Working Hours</p>
                        <p className="text-xs font-bold text-slate-800">9:30 AM - 6:30 PM</p>
                      </div>
                    </div>

                    {/* Status item 3 */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                        <Clock3 size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Entry Time</p>
                        <p className="text-xs font-bold text-slate-800">
                          {myTodayAttendance?.checkIn || "--:--"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <Link
                    href="/attendance"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-between group"
                  >
                    <span>View Attendance Calendar</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Row 2: Quick Action cards matching reference bottom row */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
              <h3 className="font-bold text-slate-800 text-base mb-4">Quick Action</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Link
                  href="/leave"
                  className="bg-slate-100/80 hover:bg-slate-100 border border-slate-300/80 rounded-xl p-4 flex items-center gap-3.5 transition group shadow-xs"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100/90 text-blue-700 border border-blue-200/80 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition shadow-2xs">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Apply Leave</h4>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">Request time off</p>
                  </div>
                </Link>

                <Link
                  href="/leave"
                  className="bg-slate-100/80 hover:bg-slate-100 border border-slate-300/80 rounded-xl p-4 flex items-center gap-3.5 transition group shadow-xs"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100/90 text-emerald-700 border border-emerald-200/80 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition shadow-2xs">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">My Leave History</h4>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">View all requests</p>
                  </div>
                </Link>

                <Link
                  href="/attendance"
                  className="bg-slate-100/80 hover:bg-slate-100 border border-slate-300/80 rounded-xl p-4 flex items-center gap-3.5 transition group shadow-xs"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100/90 text-amber-700 border border-amber-200/80 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition shadow-2xs">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Punch Record</h4>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">Check missed punches</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Admin / Manager Views: Clean Minimal Metrics & Approvals */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentUser.role === "super_admin" || currentUser.role === "hr_admin" ? (
                <>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Total Workforce</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{totalEmployees}</p>
                      <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                        <span>{activeEmployees} Active</span> • <span>{internsCount} Interns</span>
                      </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users size={22} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Today&apos;s Attendance</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{presentCount}</p>
                      <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                        <span>{lateCount} Late mark(s)</span>
                      </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Clock size={22} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Pending Leave Approvals</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{pendingLeaves.length}</p>
                      <p className="text-[11px] text-slate-500 mt-1">Requires review</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <CalendarDays size={22} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Correction Requests</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{pendingCorrections.length}</p>
                      <p className="text-[11px] text-slate-500 mt-1">Missing punches</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Clock3 size={22} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Team Size</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{myTeam.length}</p>
                      <p className="text-[11px] text-emerald-600 font-medium mt-1">Direct reports</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users size={22} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Pending Leave Requests</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1">{myTeamPendingLeaves.length}</p>
                      <p className="text-[11px] text-slate-500 mt-1">Awaiting approval</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <CalendarDays size={22} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Punch Corrections</p>
                      <p className="text-2xl font-bold text-purple-600 mt-1">{myTeamPendingCorrections.length}</p>
                      <p className="text-[11px] text-slate-500 mt-1">Team adjustments</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Clock size={22} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Team Attendance</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">92%</p>
                      <p className="text-[11px] text-emerald-600 font-medium mt-1">Normal capacity</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle size={22} />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Approvals and Announcements */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Pending Approvals Queue</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Action items requiring administrative decision</p>
                  </div>
                  <Link href="/leave" className="text-xs font-semibold text-blue-600 hover:underline">
                    View All
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {pendingLeaves.slice(0, 4).map((req) => (
                    <div key={req.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">
                          {req.leaveTypeCode}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{req.employeeName}</p>
                          <p className="text-[11px] text-slate-500">{req.startDate} to {req.endDate} ({req.durationDays}d)</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
                <h3 className="font-bold text-slate-800 text-base mb-3 flex items-center gap-2">
                  <CalendarDays size={16} className="text-blue-600" /> Upcoming Holidays
                </h3>
                <div className="divide-y divide-slate-100">
                  {upcomingHolidays.map((hol) => (
                    <div key={hol.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{hol.name}</p>
                        <p className="text-[11px] text-slate-400">{hol.dayOfWeek}</p>
                      </div>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {format(new Date(hol.date), "dd MMM")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
