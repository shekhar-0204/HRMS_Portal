"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useHRMS } from "@/context/hrms-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { FloatingNotification } from "@/components/ui/floating-notification";
import { NAVIGATION_ITEMS } from "@/config/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading, currentUser } = useHRMS(); const router=useRouter(); const pathname=usePathname();
  // Route guard (cosmetic - the API enforces permissions): a role that has no menu entry for this page goes to the dashboard.
  const allowed = NAVIGATION_ITEMS.some((n) => pathname === n.href && n.roles.includes(currentUser.role)) || !NAVIGATION_ITEMS.some((n) => pathname === n.href);
  useEffect(()=>{
    if(authLoading) return;
    if(!isAuthenticated) router.replace("/login");
    else if(currentUser.mustChangePassword && pathname!=="/change-password") router.replace("/change-password");
    else if(!allowed) router.replace("/dashboard");
  },[authLoading,isAuthenticated,currentUser.mustChangePassword,allowed,pathname,router]);
  if(authLoading || !isAuthenticated || currentUser.mustChangePassword || !allowed) return <div className="min-h-screen grid place-items-center text-slate-500 bg-[var(--background)]">Loading...</div>;
  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased relative">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <FloatingNotification />
    </div>
  );
}
