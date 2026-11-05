"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useHRMS } from "@/context/hrms-context";
import {
  Bell,
  CheckCircle2,
  Calendar,
  Clock,
  Info,
  Check,
  Filter,
  Trash2,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function NotificationsPage() {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    currentUser,
  } = useHRMS();

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "unread" | "read">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filterCategory !== "all" && n.category !== filterCategory) return false;
    if (filterStatus === "unread" && n.read) return false;
    if (filterStatus === "read" && !n.read) return false;
    return true;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h1
              className="text-2xl font-black tracking-tight flex items-center gap-2.5 text-slate-900 dark:text-white"
            >
              <span>Notifications & Alerts</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-rose-500 text-white font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  {unreadCount} Unread
                </span>
              )}
            </h1>
            <p
              className="text-xs sm:text-sm font-semibold mt-1 text-slate-600 dark:text-slate-300"
            >
              Complete history of updates, direct manager/HR notices, leave approvals, and shift alerts
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Check size={14} />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Filter:</span>
            <div className="flex items-center gap-1">
              {(["all", "unread", "read"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-lg font-semibold transition capitalize cursor-pointer",
                    filterStatus === status
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["all", "Leave", "Attendance", "Announcement", "System"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer whitespace-nowrap",
                  filterCategory === cat
                    ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {cat === "all" ? "All Categories" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Notification Cards List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No notifications found</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {filterStatus === "unread"
                  ? "You have read all your notifications!"
                  : "No notifications match this filter criteria."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "p-4 sm:p-5 flex items-start gap-4 transition hover:bg-slate-50/80 group",
                  !notif.read ? "bg-blue-50/20" : ""
                )}
              >
                {/* Category Icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {notif.category === "Leave" ? (
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Calendar size={18} />
                    </div>
                  ) : notif.category === "Attendance" ? (
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Clock size={18} />
                    </div>
                  ) : notif.category === "Announcement" ? (
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Sparkles size={18} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Info size={18} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {notif.title}
                      </h3>
                      {!notif.read && (
                        <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.2 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {notif.createdAt}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-3 mt-3 pt-2">
                    {notif.link && (
                      <Link
                        href={notif.link}
                        onClick={() => markNotificationAsRead(notif.id)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                      >
                        <span>Open details</span>
                        <ExternalLink size={12} />
                      </Link>
                    )}

                    {!notif.read ? (
                      <button
                        onClick={() => markNotificationAsRead(notif.id)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={13} />
                        <span>Mark as read</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-slate-400" />
                        <span>Read</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
