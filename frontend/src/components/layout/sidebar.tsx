"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useHRMS } from "@/context/hrms-context";
import { NAVIGATION_ITEMS } from "@/config/navigation";
import { UserRole } from "@/types";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  Menu,
  X,
  Shield,
  Briefcase,
  Users2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname(); const router = useRouter();
  const { currentUser, mobileSidebarOpen, setMobileSidebarOpen, notifications, logout } = useHRMS();
  const [collapsed, setCollapsed] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Filter items matching current user's role
  const allowedNav = NAVIGATION_ITEMS.filter((item) => item.roles.includes(currentUser.role));

  const roleLabels: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
    super_admin: { label: "Super Admin", icon: <Shield className="w-3.5 h-3.5" />, color: "bg-purple-100 text-purple-800 border-purple-200" },
    hr_admin: { label: "HR Admin", icon: <Users2 className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-800 border-blue-200" },
    department_manager: { label: "Dept Manager", icon: <Briefcase className="w-3.5 h-3.5" />, color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    employee: { label: "Employee / Intern", icon: <User className="w-3.5 h-3.5" />, color: "bg-slate-100 text-slate-800 border-slate-200" },
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white text-slate-700 border-r border-slate-200/80 select-none shadow-xs">
      {/* Brand Header (Desktop) */}
      <div className={cn(
        "hidden lg:flex items-center h-16 border-b border-slate-100 transition-all",
        collapsed ? "flex-col justify-center px-1" : "justify-between px-4"
      )}>
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden" title="Graapes HRMS">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700/80 flex items-center justify-center p-0.5 flex-shrink-0 shadow-md overflow-hidden mx-auto">
            <img
              src="/graapes-logo.png"
              alt="Graapes Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-sm tracking-tight leading-none">GRAAPES</span>
              <span className="text-[10px] text-blue-600 font-semibold tracking-wider uppercase mt-1">HRMS Portal</span>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            title="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Expand Button for Collapsed Mode (Placed right below logo) */}
      {collapsed && (
        <div className="py-2 flex justify-center border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setCollapsed(false)}
            className="w-8 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition shadow-2xs group"
            title="Expand sidebar"
          >
            <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}





      {/* Navigation List - Minimal Clean Light Theme */}
      <nav className={cn(
        "flex-1 overflow-y-auto py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-200",
        collapsed ? "px-1.5 flex flex-col items-center" : "px-3"
      )}>
        {allowedNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href + item.title}
              href={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                "flex items-center rounded-xl text-[13px] font-medium transition-all group",
                collapsed ? "w-10 h-10 justify-center p-0" : "w-full gap-3 px-3 py-2",
                isActive
                  ? "bg-blue-50 text-blue-600 font-semibold border border-blue-100/60 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
              title={collapsed ? item.title : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon
                  size={18}
                  className={cn(
                    "transition-colors",
                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                {collapsed && item.href === "/notifications" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </div>
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.title}</span>
                  {item.href === "/notifications" && unreadCount > 0 && (
                    <span className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full shadow-2xs">
                      {unreadCount}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Footer */}
      <div className={cn(
        "border-t border-slate-100 bg-slate-50/60",
        collapsed ? "py-3 px-1 flex flex-col items-center gap-2" : "p-3"
      )}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <Link
            href="/profile"
            title={collapsed ? `${currentUser.name} (View Profile)` : undefined}
            className="hover:opacity-85 transition rounded-full ring-2 ring-transparent hover:ring-blue-200"
          >
            <img
              src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"
            />
          </Link>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <Link href="/profile" className="block hover:underline">
                <p className="text-xs font-semibold text-slate-800 truncate">{currentUser.name}</p>
              </Link>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.2 rounded border", roleLabels[currentUser.role].color)}>
                  {roleLabels[currentUser.role].label}
                </span>
              </div>
            </div>
          )}
          {!collapsed && (
            <button onClick={async()=>{await logout();router.replace("/login")}} title="Sign Out" className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition"><LogOut size={16} /></button>
          )}
        </div>
        {collapsed && (
          <button onClick={async()=>{await logout();router.replace("/login")}} title="Sign Out" className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition"><LogOut size={15} /></button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-2xs animate-in fade-in duration-150"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl transition-transform duration-200 ease-in-out bg-white flex flex-col",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile Header with Logo on Left and Close 'X' on Far Right */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 flex-shrink-0 bg-white">
          <Link
            href="/dashboard"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center gap-3 overflow-hidden"
            title="Graapes HRMS"
          >
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700/80 flex items-center justify-center p-0.5 flex-shrink-0 shadow-md overflow-hidden">
              <img
                src="/graapes-logo.png"
                alt="Graapes Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-sm tracking-tight leading-none">GRAAPES</span>
              <span className="text-[10px] text-blue-600 font-semibold tracking-wider uppercase mt-1">HRMS Portal</span>
            </div>
          </Link>

          {/* Close Button shifted to the right side of mobile sidebar */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
            title="Close Menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body content without duplicated brand header */}
        <div className="flex-1 overflow-y-auto">
          {navContent}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:block h-screen sticky top-0 transition-all duration-200 ease-in-out flex-shrink-0 z-20",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
