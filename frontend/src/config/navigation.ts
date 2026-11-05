import { UserRole } from "@/types";
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CalendarDays,
  Palmtree,
  FileText,
  Megaphone,
  Bell,
  BarChart3,
  ShieldCheck,
  History,
  Settings,
  UserCheck,
  UserCircle,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  roles: UserRole[];
}

export const NAVIGATION_ITEMS: NavItem[] = [
  // Dashboard views
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "hr_admin"],
  },
  {
    title: "Team Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["department_manager"],
  },
  {
    title: "My Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["employee"],
  },

  // Directory / Team (Super Admin, HR Admin & Department Manager)
  {
    title: "Employee Directory",
    href: "/employees",
    icon: Users,
    roles: ["super_admin", "hr_admin"],
  },
  {
    title: "My Team",
    href: "/employees",
    icon: Users,
    roles: ["department_manager"],
  },

  // Departments (Integrated Department & Employee View for HR Admin & Super Admin)
  {
    title: "Departments",
    href: "/organization",
    icon: Building2,
    roles: ["hr_admin"],
  },
  {
    title: "Organization",
    href: "/organization",
    icon: Building2,
    roles: ["super_admin"],
  },

  // Attendance
  {
    title: "Attendance",
    href: "/attendance",
    icon: Clock,
    roles: ["super_admin", "hr_admin"],
  },
  {
    title: "Team Attendance",
    href: "/attendance",
    icon: Clock,
    roles: ["department_manager"],
  },
  {
    title: "My Attendance",
    href: "/attendance",
    icon: Clock,
    roles: ["employee"],
  },

  // Leave
  {
    title: "Leave Management",
    href: "/leave",
    icon: CalendarDays,
    roles: ["super_admin", "hr_admin"],
  },
  {
    title: "Leave Approvals",
    href: "/leave",
    icon: CalendarDays,
    roles: ["department_manager"],
  },
  {
    title: "My Leave",
    href: "/leave",
    icon: CalendarDays,
    roles: ["employee"],
  },

  // Holidays
  {
    title: "Holidays",
    href: "/holidays",
    icon: Palmtree,
    roles: ["super_admin", "hr_admin", "employee", "department_manager"],
  },

  // Documents
  {
    title: "Documents",
    href: "/documents",
    icon: FileText,
    roles: ["super_admin", "hr_admin"],
  },
  {
    title: "My Documents",
    href: "/documents",
    icon: FileText,
    roles: ["employee", "department_manager"],
  },

  // Announcements
  {
    title: "Announcements",
    href: "/announcements",
    icon: Megaphone,
    roles: ["super_admin", "hr_admin", "department_manager", "employee"],
  },

  // Notifications Hub
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
    roles: ["super_admin", "hr_admin", "department_manager", "employee"],
  },

  // Reports
  {
    title: "Reports & Analytics",
    href: "/reports",
    icon: BarChart3,
    roles: ["super_admin", "hr_admin"],
  },
  {
    title: "Team Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["department_manager"],
  },

  // Admin exclusive
  {
    title: "User Management",
    href: "/users",
    icon: UserCheck,
    roles: ["super_admin"],
  },
  {
    title: "Roles & Permissions",
    href: "/roles",
    icon: ShieldCheck,
    roles: ["super_admin"],
  },
  {
    title: "Audit Logs",
    href: "/audit-logs",
    icon: History,
    roles: ["super_admin", "hr_admin"],
  },

  // Settings & Profile
  {
    title: "My Profile",
    href: "/profile",
    icon: UserCircle,
    roles: ["employee", "department_manager", "hr_admin", "super_admin"],
  },
  {
    title: "Account Settings",
    href: "/settings",
    icon: Settings,
    roles: ["employee"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["super_admin", "hr_admin", "department_manager"],
  },
];
