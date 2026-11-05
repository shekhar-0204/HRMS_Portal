"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useHRMS } from "@/context/hrms-context";
import { Holiday } from "@/types";
import {
  CalendarDays,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Palmtree,
  CheckCircle2,
  Tag,
  Info,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  getDay,
  addMonths,
  subMonths,
} from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function HolidaysPage() {
  const { currentUser, holidays, addHoliday, deleteHoliday } = useHRMS();

  const [currentMonth, setCurrentMonth] = useState(new Date(2000, 0, 1)); // replaced with the real month right after mount
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [showAddModal, setShowAddModal] = useState(false);

  const [newHoliday, setNewHoliday] = useState({
    name: "",
    date: "",
    dayOfWeek: "Sunday",
    type: "Company Festival" as Holiday["type"],
  });

  useEffect(() => {
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentMonth(now);
    setNewHoliday((h) => ({ ...h, date: format(now, "yyyy-MM-dd") }));
  }, []);

  const canManage = currentUser.role === "super_admin" || currentUser.role === "hr_admin";

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.date) {
      toast.error("Please enter holiday name and date");
      return;
    }
    const dateObj = new Date(newHoliday.date);
    const day = format(dateObj, "EEEE");

    const ok = await addHoliday({
      ...newHoliday,
      dayOfWeek: day,
    });
    if (!ok) return;
    setShowAddModal(false);
    setSelectedDate(newHoliday.date);
    setNewHoliday({ name: "", date: format(new Date(), "yyyy-MM-dd"), dayOfWeek: "Sunday", type: "Company Festival" });
  };

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOffset = getDay(monthStart); // 0 (Sun) to 6 (Sat)

  // Holidays this month
  const monthHolidays = holidays.filter((h) => {
    const hDate = new Date(h.date);
    return isSameMonth(hDate, currentMonth);
  });

  // Selected holiday info
  const selectedHoliday = holidays.find((h) => h.date === selectedDate);

  const getHolidayColor = (type: Holiday["type"]) => {
    if (type === "National Holiday") {
      return {
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        cell: "bg-blue-50/80 text-blue-700 border-blue-200/80 font-bold",
        dot: "bg-blue-500",
      };
    }
    if (type === "Restricted Holiday") {
      return {
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        cell: "bg-amber-50/80 text-amber-700 border-amber-200/80 font-bold",
        dot: "bg-amber-500",
      };
    }
    return {
      badge: "bg-purple-50 text-purple-700 border-purple-200",
      cell: "bg-purple-50/80 text-purple-700 border-purple-200/80 font-bold",
      dot: "bg-purple-500",
    };
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header - Minimal HRM Portal Styling */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Company Holiday Calendar</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium border border-blue-100">
                {holidays.length} Total Declared
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Official public holidays, company festivals, and optional restricted days.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs">
              <button
                onClick={() => setViewMode("calendar")}
                className={cn(
                  "py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-1.5",
                  viewMode === "calendar"
                    ? "bg-blue-50 text-blue-600 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <CalendarIcon size={14} /> Calendar
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-1.5",
                  viewMode === "list"
                    ? "bg-blue-50 text-blue-600 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <Palmtree size={14} /> All Holidays
              </button>
            </div>

            {canManage && (
              <button
                onClick={() => setShowAddModal(true)}
                className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center gap-1.5"
              >
                <Plus size={15} /> Add Holiday
              </button>
            )}
          </div>
        </div>

        {/* Calendar View Mode */}
        {viewMode === "calendar" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Minimal Calendar Card (2 Cols) - Compact & Aesthetic */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs">
              {/* Calendar Month Header */}
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {format(currentMonth, "MMMM yyyy")}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {monthHolidays.length} holiday{monthHolidays.length === 1 ? "" : "s"} in this month
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                    className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition border border-slate-200"
                    title="Previous Month"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="py-0.5 px-2 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                    className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition border border-slate-200"
                    title="Next Month"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>

              {/* Day of week headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                  <div
                    key={day}
                    className={cn(
                      "text-[10px] font-semibold py-0.5 uppercase tracking-wider",
                      idx === 0 || idx === 6 ? "text-rose-500/80" : "text-slate-400"
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days Grid (Compact Size) */}
              <div className="grid grid-cols-7 gap-1">
                {/* Blank days before start of month */}
                {Array.from({ length: startDayOffset }).map((_, index) => (
                  <div key={`offset-${index}`} className="h-11 sm:h-12 rounded-lg bg-slate-50/40 border border-transparent" />
                ))}

                {/* Actual Days */}
                {daysInMonth.map((dayObj) => {
                  const dateStr = format(dayObj, "yyyy-MM-dd");
                  const holiday = holidays.find((h) => h.date === dateStr);
                  const isSelected = selectedDate === dateStr;
                  const dayOfWeek = getDay(dayObj);
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                  const colorInfo = holiday ? getHolidayColor(holiday.type) : null;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDate(dateStr)}
                      className={cn(
                        "h-11 sm:h-12 p-1 sm:p-1.5 rounded-lg text-left flex flex-col justify-between transition relative border group",
                        isSelected
                          ? "ring-2 ring-blue-500 shadow-xs"
                          : "hover:border-slate-300",
                        holiday
                          ? colorInfo?.cell
                          : isWeekend
                          ? "bg-slate-50/60 border-slate-100 text-slate-400"
                          : "bg-white border-slate-100/90 text-slate-700"
                      )}
                    >
                      <div className="flex items-center justify-between w-full leading-none">
                        <span
                          className={cn(
                            "text-[11px] font-semibold",
                            holiday ? "text-slate-900 font-bold" : isWeekend ? "text-slate-400" : "text-slate-700"
                          )}
                        >
                          {format(dayObj, "d")}
                        </span>
                        {holiday && (
                          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", colorInfo?.dot)} />
                        )}
                      </div>

                      {holiday ? (
                        <div className="w-full truncate leading-none">
                          <span className="block text-[9px] font-bold truncate text-slate-900">
                            {holiday.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-300 group-hover:text-slate-400 leading-none">
                          {isWeekend ? "Off" : ""}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 pt-5 mt-5 border-t border-slate-100 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Legend:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>National Holiday</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>Company Festival</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Restricted Holiday</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span>Weekend Off</span>
                </div>
              </div>
            </div>

            {/* Selected Date / Month Holiday Details (Right Col) */}
            <div className="space-y-6">
              {/* Selected Day Inspector */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
                <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
                  <span>Selected Date Details</span>
                  {selectedDate && (
                    <span className="text-[11px] font-mono text-slate-400">
                      {format(new Date(selectedDate), "dd MMM yyyy")}
                    </span>
                  )}
                </h3>

                {selectedHoliday ? (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border border-blue-100 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                            getHolidayColor(selectedHoliday.type).badge
                          )}
                        >
                          {selectedHoliday.type}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-2">
                          {selectedHoliday.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {selectedHoliday.dayOfWeek} • {format(new Date(selectedHoliday.date), "MMMM dd, yyyy")}
                        </p>
                      </div>

                      {canManage && (
                        <button
                          onClick={() => deleteHoliday(selectedHoliday.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition"
                          title="Delete Holiday"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-600 pt-2 border-t border-blue-200/60 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>Company declared day-off. Payroll and attendance exempt.</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <Palmtree size={22} className="mx-auto mb-2 text-slate-300" />
                    <span>No declared holiday on this date.</span>
                    <p className="text-[10px] text-slate-400 mt-1">Click any colored date on the calendar to view its holiday details.</p>
                  </div>
                )}
              </div>

              {/* Holidays in this Month List */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900 text-sm">
                    In {format(currentMonth, "MMMM")} ({monthHolidays.length})
                  </h3>
                </div>

                <div className="divide-y divide-slate-100">
                  {monthHolidays.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">
                      No declared holidays in {format(currentMonth, "MMMM yyyy")}.
                    </p>
                  ) : (
                    monthHolidays.map((hol) => {
                      const color = getHolidayColor(hol.type);
                      const isSelected = selectedDate === hol.date;
                      return (
                        <div
                          key={hol.id}
                          onClick={() => setSelectedDate(hol.date)}
                          className={cn(
                            "py-3 px-2 flex items-center justify-between cursor-pointer rounded-xl transition hover:bg-slate-50",
                            isSelected ? "bg-blue-50/60" : ""
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex flex-col items-center justify-center font-bold text-xs flex-shrink-0 border border-blue-100">
                              <span className="text-[9px] uppercase font-semibold text-blue-500">
                                {format(new Date(hol.date), "MMM")}
                              </span>
                              <span className="text-sm font-bold leading-none">
                                {format(new Date(hol.date), "dd")}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{hol.name}</p>
                              <p className="text-[11px] text-slate-400">{hol.dayOfWeek}</p>
                            </div>
                          </div>
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded border", color.badge)}>
                            {hol.type.split(" ")[0]}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* List View Mode (Card Grid) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holidays.map((hol) => {
              const color = getHolidayColor(hol.type);
              return (
                <div
                  key={hol.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-start justify-between group hover:border-blue-300 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-800 border border-blue-100 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[10px] uppercase font-bold text-blue-600">
                        {format(new Date(hol.date), "MMM")}
                      </span>
                      <span className="text-base font-extrabold leading-none mt-0.5">
                        {format(new Date(hol.date), "dd")}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{hol.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{hol.dayOfWeek}</p>
                      <span className={cn("inline-block text-[10px] font-semibold px-2 py-0.5 rounded mt-2 border", color.badge)}>
                        {hol.type}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <button
                      onClick={() => deleteHoliday(hol.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition"
                      title="Remove holiday"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Holiday Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setShowAddModal(false)} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200/80">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-sm text-slate-900">Add Company Holiday</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Holiday Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diwali / New Year Day"
                    value={newHoliday.name}
                    onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Holiday Category</label>
                  <select
                    value={newHoliday.type}
                    onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value as Holiday["type"] })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="National Holiday">National Holiday</option>
                    <option value="Company Festival">Company Festival</option>
                    <option value="Restricted Holiday">Restricted Holiday (Optional)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="py-1.5 px-3 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm"
                  >
                    Add to Calendar
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
