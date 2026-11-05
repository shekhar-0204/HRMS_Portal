"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  format,
  parse,
  isValid,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  minDate?: string;
  maxDate?: string;
  className?: string;
  required?: boolean;
  align?: "left" | "right";
}

export function CustomDatePicker({
  value,
  onChange,
  className,
  align = "left",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current date value
  const parsedCurrent = value ? parse(value, "yyyy-MM-dd", new Date()) : new Date();
  const validCurrent = isValid(parsedCurrent) ? parsedCurrent : new Date();

  const [viewMonth, setViewMonth] = useState<Date>(validCurrent);

  // Keep viewMonth synced if value changes externally
  useEffect(() => {
    if (value) {
      const d = parse(value, "yyyy-MM-dd", new Date());
      if (isValid(d)) {
        const timer = setTimeout(() => setViewMonth(d), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [value]);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOffset = getDay(monthStart);

  const handleDaySelect = (dayObj: Date) => {
    const formatted = format(dayObj, "yyyy-MM-dd");
    onChange(formatted);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Trigger Button that opens in-modal custom calendar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-left cursor-pointer"
      >
        <span className="font-medium">
          {value && isValid(validCurrent) ? format(validCurrent, "dd-MM-yyyy") : "Select date"}
        </span>
        <CalendarIcon size={14} className="text-slate-400 flex-shrink-0" />
      </button>

      {/* Floating In-Modal Popover Window (Contained & Positioned Safely) */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 w-64 bg-white rounded-xl shadow-2xl border border-slate-200/90 p-3 select-none animate-in fade-in zoom-in-95 duration-100",
            "bottom-full mb-1.5 sm:bottom-auto sm:top-full sm:mt-1.5",
            align === "right" ? "right-0 left-auto" : "left-0"
          )}
        >
          {/* Header Month / Year & Nav Arrows */}
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
            <span className="font-bold text-xs text-slate-900">
              {format(viewMonth, "MMMM yyyy")}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setViewMonth((prev) => subMonths(prev, 1))}
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(new Date())}
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-blue-600 hover:bg-blue-50 transition"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setViewMonth((prev) => addMonths(prev, 1))}
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, idx) => (
              <span
                key={day}
                className={cn(
                  "text-[10px] font-semibold py-0.5 uppercase",
                  idx === 0 || idx === 6 ? "text-rose-500" : "text-slate-400"
                )}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank offset days */}
            {Array.from({ length: startDayOffset }).map((_, index) => (
              <div key={`offset-${index}`} className="h-6 w-full" />
            ))}

            {/* Days of Month */}
            {daysInMonth.map((dayObj) => {
              const isSelected = value && isValid(validCurrent) && isSameDay(dayObj, validCurrent);
              const isTodayDate = isToday(dayObj);

              return (
                <button
                  key={dayObj.toISOString()}
                  type="button"
                  onClick={() => handleDaySelect(dayObj)}
                  className={cn(
                    "h-6 w-full rounded-md text-[11px] font-medium flex items-center justify-center transition cursor-pointer",
                    isSelected
                      ? "bg-blue-600 text-white font-bold shadow-2xs"
                      : isTodayDate
                      ? "bg-blue-50 text-blue-700 font-bold hover:bg-blue-100"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {format(dayObj, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
