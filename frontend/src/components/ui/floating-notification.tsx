"use client";

import React, { useState, useEffect } from "react";
import { useHRMS } from "@/context/hrms-context";
import { AppNotification } from "@/types";
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Floating Live Notification Toast Banner
 * Slides into the top-right / bottom-right corner when an in-app notification triggers,
 * with sound cue, category icon, action link, and auto-dismiss timer.
 */
export function FloatingNotification() {
  const { notifications, markNotificationAsRead, theme } = useHRMS();
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Listen for the most recent unread notification that hasn't been dismissed yet
  useEffect(() => {
    const unreadNotifications = notifications.filter((n) => !n.read && !dismissedIds.has(n.id));
    if (unreadNotifications.length > 0) {
      const latest = unreadNotifications[0];
      const showTimer = setTimeout(() => {
        setActiveToast(latest);
      }, 50);

      // Fast auto-dismiss after 2.5 seconds
      const dismissTimer = setTimeout(() => {
        setDismissedIds((prev) => new Set(prev).add(latest.id));
        setActiveToast((current) => (current?.id === latest.id ? null : current));
      }, 2500);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(dismissTimer);
      };
    } else {
      const clearTimer = setTimeout(() => setActiveToast(null), 50);
      return () => clearTimeout(clearTimer);
    }
  }, [notifications, dismissedIds]);

  if (!activeToast) return null;

  const handleDismiss = () => {
    if (activeToast) {
      setDismissedIds((prev) => new Set(prev).add(activeToast.id));
      setActiveToast(null);
    }
  };

  const handleAction = () => {
    if (activeToast) {
      markNotificationAsRead(activeToast.id);
      setDismissedIds((prev) => new Set(prev).add(activeToast.id));
      setActiveToast(null);
    }
  };

  const isDark = theme === "dark";

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[99] max-w-xs w-full animate-in slide-in-from-bottom-3 fade-in duration-150 pointer-events-auto">
      <div
        className={cn(
          "rounded-xl p-3 shadow-xl border flex items-center gap-2.5 relative overflow-hidden group backdrop-blur-md transition-colors",
          isDark
            ? "bg-slate-900/95 text-white border-slate-800"
            : "bg-white text-slate-800 border-slate-200"
        )}
      >
        {/* Animated 2.5s Progress Bar Indicator */}
        <div className={cn("absolute bottom-0 left-0 right-0 h-0.5", isDark ? "bg-slate-800" : "bg-slate-100")}>
          <div className="h-full bg-blue-500 animate-[pulse_2.5s_linear_infinite]" />
        </div>

        {/* Small Icon */}
        <div className="flex-shrink-0">
          {activeToast.category === "Leave" ? (
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center border",
                isDark
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "bg-blue-50 text-blue-600 border-blue-100"
              )}
            >
              <Calendar size={14} />
            </div>
          ) : activeToast.category === "Attendance" ? (
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center border",
                isDark
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-amber-50 text-amber-600 border-amber-100"
              )}
            >
              <Clock size={14} />
            </div>
          ) : (
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center border",
                isDark
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-emerald-50 text-emerald-600 border-emerald-100"
              )}
            >
              <Sparkles size={14} />
            </div>
          )}
        </div>

        {/* Compact Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1">
            <h4 className={cn("text-[11px] font-bold truncate leading-tight", isDark ? "text-slate-100" : "text-slate-900")}>
              {activeToast.title}
            </h4>
          </div>
          <p className={cn("text-[10px] truncate mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>
            {activeToast.message}
          </p>
          {activeToast.link && (
            <Link
              href={activeToast.link}
              onClick={handleAction}
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold mt-1 transition",
                isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700 hover:underline"
              )}
            >
              <span>View</span>
              <ArrowRight size={10} />
            </Link>
          )}
        </div>

        {/* Instant Dismiss Button */}
        <button
          onClick={handleDismiss}
          className={cn(
            "p-1 rounded-md transition flex-shrink-0 cursor-pointer",
            isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          )}
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
