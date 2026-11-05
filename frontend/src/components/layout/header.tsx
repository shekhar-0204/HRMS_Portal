"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useHRMS } from "@/context/hrms-context";
import {
  Bell,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  Info,
  X,
  Check,
  Sun,
  Moon,
  Menu,
  User,
  FileText,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    currentUser,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    theme,
    setTheme,
    toggleMobileSidebar,
    employees,
    documents,
  } = useHRMS();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadNotifications = notifications.filter((n) => !n.read);
  const unreadCount = unreadNotifications.length;

  // Search Results filtering
  const q = searchQuery.trim().toLowerCase();
  const filteredEmployees = q
    ? employees.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.employeeId.toLowerCase().includes(q) ||
          e.workEmail.toLowerCase().includes(q) ||
          e.designationTitle.toLowerCase().includes(q) ||
          e.departmentName.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const quickPages = [
    { title: "Employee Directory", href: "/employees", category: "Navigation" },
    { title: "Attendance & Punch Log", href: "/attendance", category: "Navigation" },
    { title: "Leave Portal & Requests", href: "/leave", category: "Navigation" },
    { title: "Holiday Calendar", href: "/holidays", category: "Navigation" },
    { title: "Company Announcements", href: "/announcements", category: "Navigation" },
    { title: "HR Letters & Documents", href: "/documents", category: "Navigation" },
    { title: "Organization & Teams", href: "/organization", category: "Navigation" },
  ];

  const filteredPages = q
    ? quickPages.filter((p) => p.title.toLowerCase().includes(q)).slice(0, 3)
    : [];

  const filteredDocs = q
    ? documents.filter((d) => d.title.toLowerCase().includes(q)).slice(0, 2)
    : [];

  const hasResults = filteredEmployees.length > 0 || filteredPages.length > 0 || filteredDocs.length > 0;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle clicking on single notification: mark read, route if link exists, and immediately close dropdown
  const handleItemClick = (notif: { id: string; link?: string }) => {
    markNotificationAsRead(notif.id);
    setShowNotifications(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  // Handle Mark all as read: mark all and close the dropdown popup
  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
    setShowNotifications(false);
  };

  // Title generator
  const getPageTitle = (path: string) => {
    if (path.includes("dashboard")) return "Dashboard";
    if (path.includes("employees")) return currentUser.role === "department_manager" ? "My Team Members" : "Employee Directory";
    if (path.includes("organization")) return currentUser.role === "hr_admin" ? "Departments & Employees" : "Organization Structure";
    if (path.includes("attendance")) return currentUser.role === "employee" ? "My Attendance Record" : "Attendance Management";
    if (path.includes("leave")) return currentUser.role === "employee" ? "My Leave Portal" : "Leave Management & Approvals";
    if (path.includes("holidays")) return "Company Holiday Calendar";
    if (path.includes("documents")) return currentUser.role === "employee" ? "My Documents & HR Letters" : "Document Repository";
    if (path.includes("announcements")) return "Company Announcements";
    if (path.includes("notifications")) return "Notifications & Alert Center";
    if (path.includes("reports")) return "HR Analytics & Operational Reports";
    if (path.includes("users")) return "User Management & System Access";
    if (path.includes("roles")) return "Roles & Security Permissions";
    if (path.includes("audit-logs")) return "System Audit Trail & History";
    if (path.includes("settings")) return "Portal Preferences & Policies";
    if (path.includes("profile")) return "Personal Profile & Information";
    return "HRMS Portal";
  };

  const isDark = theme === "dark";

  return (
    <header className={cn(
      "h-16 border-b sticky top-0 z-20 flex items-center justify-between px-3.5 sm:px-6 lg:px-8 transition-colors",
      isDark
        ? "bg-[#111827] border-slate-800 text-white"
        : "bg-white border-slate-200/90 text-slate-800 shadow-2xs"
    )}>
      {/* Brand & Page Identity */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {/* Mobile Hamburger Menu Button */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 dark:text-slate-200 dark:bg-slate-800 transition cursor-pointer shadow-2xs flex-shrink-0"
          title="Open Navigation Menu"
        >
          <Menu size={19} className="stroke-[2] text-slate-800 dark:text-slate-100" />
        </button>

        {/* Mobile: Graapes Brand Emblem (Since sidebar is closed on mobile) */}
        <div className="lg:hidden min-w-0 flex items-center gap-2.5">
          <Link href="/dashboard" className="flex items-center gap-2 group" title="Graapes HRMS">
            <div className="w-8.5 h-8.5 rounded-full bg-black border border-slate-700 flex items-center justify-center p-0.5 flex-shrink-0 shadow-xs">
              <img
                src="/graapes-logo.png"
                alt="Graapes Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="flex flex-col">
              <span
                className="font-black text-xs tracking-tight"
                style={{ color: isDark ? "#ffffff" : "#0f172a" }}
              >
                GRAAPES
              </span>
              <span
                className="text-[10px] font-bold leading-none capitalize mt-0.5"
                style={{ color: isDark ? "#cbd5e1" : "#475569" }}
              >
                {currentUser.role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop: Page Title & Breadcrumb (No redundant logo since sidebar already has logo) */}
        <div className="hidden lg:flex flex-col">
          <h1
            className="text-base font-bold leading-tight"
            style={{ color: isDark ? "#ffffff" : "#0f172a" }}
          >
            {getPageTitle(pathname)}
          </h1>
          <span
            className="text-xs font-semibold capitalize mt-0.5"
            style={{ color: isDark ? "#cbd5e1" : "#334155" }}
          >
            {currentUser.role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} • Portal Overview
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        {/* Global Quick Search with Live Dropdown */}
        <div className="hidden md:flex items-center relative" ref={searchRef}>
          <Search size={14} className="absolute left-3 text-slate-400 z-10" />
          <input
            type="text"
            placeholder="Search people, leave, policies..."
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            className="pl-8.5 pr-8 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-900 border border-slate-300 focus:border-blue-500 rounded-lg w-52 lg:w-72 transition focus:outline-none shadow-2xs font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X size={12} />
            </button>
          )}

          {/* Interactive Search Results Popover */}
          {isSearchOpen && searchQuery.trim() && (
            <div className="absolute top-full mt-2 left-0 right-0 lg:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
              <div className="p-2 border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                <span>Quick Results</span>
                <span>Press Esc to close</span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {!hasResults ? (
                  <div className="p-4 text-center text-slate-500">
                    No matching employees, policies, or pages found for &quot;<span className="font-semibold">{searchQuery}</span>&quot;
                  </div>
                ) : (
                  <>
                    {/* Employees */}
                    {filteredEmployees.length > 0 && (
                      <div className="p-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 block">
                          People ({filteredEmployees.length})
                        </span>
                        {filteredEmployees.map((emp) => (
                          <div
                            key={emp.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchQuery("");
                              router.push("/employees");
                            }}
                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100 transition cursor-pointer group"
                          >
                            <img
                              src={emp.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                              alt={emp.fullName}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800 group-hover:text-blue-600 truncate">
                                {emp.fullName}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {emp.designationTitle} • {emp.departmentName}
                              </p>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                              {emp.employeeId}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Pages */}
                    {filteredPages.length > 0 && (
                      <div className="p-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 block">
                          Navigation ({filteredPages.length})
                        </span>
                        {filteredPages.map((page) => (
                          <Link
                            key={page.href}
                            href={page.href}
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchQuery("");
                            }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 transition text-slate-700 hover:text-blue-600 font-medium"
                          >
                            <div className="flex items-center gap-2">
                              <CalendarDays size={13} className="text-slate-400" />
                              <span>{page.title}</span>
                            </div>
                            <ExternalLink size={12} className="text-slate-400" />
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Company Documents & Policies */}
                    {filteredDocs.length > 0 && (
                      <div className="p-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 block">
                          Documents ({filteredDocs.length})
                        </span>
                        {filteredDocs.map((doc) => (
                          <Link
                            key={doc.id}
                            href="/documents"
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchQuery("");
                            }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 transition text-slate-700 hover:text-blue-600 font-medium"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText size={13} className="text-emerald-500 flex-shrink-0" />
                              <span className="truncate">{doc.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase">{doc.category}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Theme Toggle button */}
        <button
          onClick={() => {
            const nextTheme = theme === "dark" ? "light" : "dark";
            setTheme(nextTheme);
          }}
          className="w-8.5 h-8.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? (
            <Sun size={17} className="text-amber-400 hover:rotate-45 transition-transform" />
          ) : (
            <Moon size={17} className="text-slate-600 hover:-rotate-12 transition-transform" />
          )}
        </button>

        {/* Notifications dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8.5 h-8.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer relative"
            title="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {showNotifications && (
            <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 mt-2 sm:w-96 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-800">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[11px] bg-rose-100 text-rose-700 font-medium px-2 py-0.5 rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline flex items-center gap-1"
                      title="Mark all as read & close"
                    >
                      <Check size={13} />
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                    title="Close"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {unreadNotifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                    <p className="font-semibold text-slate-700">All caught up!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">No unread notifications right now</p>
                  </div>
                ) : (
                  unreadNotifications.slice(0, 4).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleItemClick(notif)}
                      className="p-3.5 hover:bg-slate-50 transition cursor-pointer flex gap-3 text-left group bg-blue-50/20"
                      title="Click to mark as read & open"
                    >
                      <div className="mt-0.5">
                        {notif.category === "Leave" ? (
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                            <Calendar size={14} />
                          </div>
                        ) : notif.category === "Attendance" ? (
                          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                            <Clock size={14} />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                            <Info size={14} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono ml-2 flex-shrink-0">
                            {notif.createdAt.split(" ")[1] || notif.createdAt}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>
                      </div>
                      <div className="flex items-center flex-shrink-0">
                        <span className="w-2 h-2 rounded-full bg-rose-500" title="Unread" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold hover:underline"
                >
                  View All Notifications ({notifications.length}) →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Mini Profile */}
        <Link
          href="/profile"
          className="flex items-center gap-2.5 pl-2.5 border-l border-slate-200 dark:border-slate-800 hover:opacity-85 transition"
        >
          <img
            src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
            alt={currentUser.name}
            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
          />
          <div className="hidden sm:flex flex-col text-left">
            <span
              className="text-xs font-bold leading-tight"
              style={{ color: isDark ? "#ffffff" : "#0f172a" }}
            >
              {currentUser.name}
            </span>
            <span
              className="text-[11px] font-semibold truncate max-w-[140px] mt-0.5"
              style={{ color: isDark ? "#cbd5e1" : "#334155" }}
            >
              {currentUser.designation || currentUser.role.replace("_", " ")}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
