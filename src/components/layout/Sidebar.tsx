"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { hasPermission, Permission, Role, ROLE_COLORS, ROLE_LABELS } from "@/lib/permissions";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCircle2,
  Stethoscope,
  Pill,
  FileText,
  CreditCard,
  Package,
  Truck,
  Receipt,
  BarChart3,
  Bell,
  Settings,
  UserCog,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Activity,
  DollarSign,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Appointments", href: "/appointments", icon: Calendar, permission: "appointments:read" },
  { label: "Patients", href: "/patients", icon: Users, permission: "patients:read" },
  { label: "Doctors", href: "/doctors", icon: Stethoscope, permission: "doctors:read" },
  { label: "Treatments", href: "/treatments", icon: Activity, permission: "treatments:read" },
  { label: "Treatment Plans", href: "/treatment-plans", icon: ClipboardList, permission: "clinical:read" },
  { label: "Prescriptions", href: "/prescriptions", icon: Pill, permission: "clinical:read" },
  { label: "Billing", href: "/invoices", icon: FileText, permission: "billing:read" },
  { label: "Payments", href: "/payments", icon: CreditCard, permission: "payments:read" },
  { label: "Inventory", href: "/inventory", icon: Package, permission: "inventory:read" },
  { label: "Suppliers", href: "/suppliers", icon: Truck, permission: "inventory:read" },
  { label: "Expenses", href: "/expenses", icon: DollarSign, permission: "expenses:read" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports:read" },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Users", href: "/users", icon: UserCog, permission: "users:read" },
  { label: "Audit Logs", href: "/audit-logs", icon: Receipt, permission: "audit:read" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings:read" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  unreadCount?: number;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;

  const visibleItems = navItems.filter((item) => {
    if (!item.permission) return true;
    if (!role) return false;
    return hasPermission(role, item.permission);
  });

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-50 flex flex-col bg-white border-r border-slate-200 transition-all duration-200",
          "shadow-lg md:shadow-sm",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M12 2C8.5 2 7 5.5 7 7.5c0 1.3.4 2.5 1 3.5L6 20c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2l-2-9c.6-1 1-2.2 1-3.5C17 5.5 15.5 2 12 2z"/>
              </svg>
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="font-bold text-slate-900 text-sm leading-tight truncate">DentalCare Pro</div>
                <div className="text-xs text-slate-400 truncate">Clinic Management</div>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className={cn(
              "ml-auto hidden md:flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors",
              collapsed && "ml-0"
            )}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const isNotification = item.href === "/notifications";

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100",
                  "relative group",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <div className="relative flex-shrink-0">
                  <Icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700")} />
                  {isNotification && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        {session?.user && !collapsed && (
          <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">
                  {session.user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-medium text-slate-900 truncate">{session.user.name}</div>
                <div className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full inline-block mt-0.5",
                  ROLE_COLORS[role as Role] ?? "bg-gray-100 text-gray-600"
                )}>
                  {ROLE_LABELS[role as Role] ?? role}
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
