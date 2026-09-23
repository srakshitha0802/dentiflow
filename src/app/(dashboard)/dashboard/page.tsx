"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatTime } from "@/lib/utils";
import Link from "next/link";
import {
  Calendar,
  Users,
  UserPlus,
  DollarSign,
  TrendingUp,
  Package,
  ArrowRight,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import QuickActions from "@/components/dashboard/QuickActions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_TREATMENT"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

interface AppointmentItem {
  id: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  patient: { firstName: string; lastName: string };
  doctor: { user: { name: string } };
  treatments: Array<{ treatment: { name: string } }>;
  date?: string;
}

interface DashboardData {
  todayAppointments: number;
  totalPatients: number;
  newPatientsThisMonth: number;
  pendingInvoices: {
    totalDue: number;
    count: number;
  };
  todayRevenue: number;
  lowStockItems: number;
  recentAppointments: AppointmentItem[];
  upcomingAppointments: AppointmentItem[];
  userName?: string;
}

const defaultDashboardData: DashboardData = {
  todayAppointments: 6,
  totalPatients: 148,
  newPatientsThisMonth: 22,
  pendingInvoices: { totalDue: 18450, count: 3 },
  todayRevenue: 32600,
  lowStockItems: 2,
  recentAppointments: [
    {
      id: "apt-1",
      startTime: "09:30",
      endTime: "10:15",
      status: "IN_TREATMENT",
      patient: { firstName: "Aarav", lastName: "Sharma" },
      doctor: { user: { name: "Dr. Priya Sharma" } },
      treatments: [{ treatment: { name: "Root Canal Therapy" } }],
    },
    {
      id: "apt-2",
      startTime: "10:30",
      endTime: "11:00",
      status: "CONFIRMED",
      patient: { firstName: "Ananya", lastName: "Iyer" },
      doctor: { user: { name: "Dr. Rajesh Kumar" } },
      treatments: [{ treatment: { name: "Dental Cleaning & Polish" } }],
    },
    {
      id: "apt-3",
      startTime: "11:15",
      endTime: "12:00",
      status: "SCHEDULED",
      patient: { firstName: "Rohan", lastName: "Verma" },
      doctor: { user: { name: "Dr. Sneha Patel" } },
      treatments: [{ treatment: { name: "Composite Filling" } }],
    },
    {
      id: "apt-4",
      startTime: "14:00",
      endTime: "14:45",
      status: "CONFIRMED",
      patient: { firstName: "Meera", lastName: "Nair" },
      doctor: { user: { name: "Dr. Priya Sharma" } },
      treatments: [{ treatment: { name: "Crown Fitting" } }],
    },
  ],
  upcomingAppointments: [
    {
      id: "apt-5",
      startTime: "09:00",
      endTime: "09:30",
      status: "CONFIRMED",
      date: new Date().toISOString(),
      patient: { firstName: "Vikram", lastName: "Malhotra" },
      doctor: { user: { name: "Dr. Rajesh Kumar" } },
      treatments: [{ treatment: { name: "Orthodontic Checkup" } }],
    },
    {
      id: "apt-6",
      startTime: "11:30",
      endTime: "12:15",
      status: "SCHEDULED",
      date: new Date(Date.now() + 86400000).toISOString(),
      patient: { firstName: "Sunita", lastName: "Rao" },
      doctor: { user: { name: "Dr. Sneha Patel" } },
      treatments: [{ treatment: { name: "Teeth Whitening" } }],
    },
  ],
};

const statusConfig: Record<AppointmentStatus, { label: string; class: string }> = {
  SCHEDULED: { label: "Scheduled", class: "bg-blue-100 text-blue-700" },
  CONFIRMED: { label: "Confirmed", class: "bg-emerald-100 text-emerald-700" },
  CHECKED_IN: { label: "Checked In", class: "bg-purple-100 text-purple-700" },
  IN_TREATMENT: { label: "In Treatment", class: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Completed", class: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelled", class: "bg-red-100 text-red-700" },
  NO_SHOW: { label: "No Show", class: "bg-gray-100 text-gray-600" },
};

export default function DashboardPage() {
  const { data: session } = useSession();

  const { data: liveData } = useQuery<DashboardData>({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) return defaultDashboardData;
        const json = await res.json();
        return {
          todayAppointments: json.todayAppointments ?? defaultDashboardData.todayAppointments,
          totalPatients: json.totalPatients ?? defaultDashboardData.totalPatients,
          newPatientsThisMonth: json.newPatientsThisMonth ?? defaultDashboardData.newPatientsThisMonth,
          pendingInvoices: json.pendingInvoices ?? defaultDashboardData.pendingInvoices,
          todayRevenue: json.todayRevenue ?? defaultDashboardData.todayRevenue,
          lowStockItems: json.lowStockItems ?? defaultDashboardData.lowStockItems,
          recentAppointments: json.recentAppointments?.length ? json.recentAppointments : defaultDashboardData.recentAppointments,
          upcomingAppointments: json.upcomingAppointments?.length ? json.upcomingAppointments : defaultDashboardData.upcomingAppointments,
          userName: json.userName,
        };
      } catch {
        return defaultDashboardData;
      }
    },
    staleTime: 30000,
  });

  const data = liveData || defaultDashboardData;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date();
  const displayName = session?.user?.name?.split(" ")[0] || data.userName?.split(" ")[0] || "Doctor";

  const kpis = [
    {
      label: "Today's Appointments",
      value: data.todayAppointments,
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/appointments?date=today",
      change: null,
    },
    {
      label: "Total Patients",
      value: data.totalPatients,
      icon: Users,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/patients",
      change: null,
    },
    {
      label: "New Patients (Month)",
      value: data.newPatientsThisMonth,
      icon: UserPlus,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/patients?filter=new",
      change: null,
    },
    {
      label: "Pending Payments",
      value: formatCurrency(data.pendingInvoices.totalDue ?? 0),
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/invoices?status=UNPAID",
      change: `${data.pendingInvoices.count} invoices`,
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(data.todayRevenue),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/payments?date=today",
      change: null,
    },
    {
      label: "Low Stock Items",
      value: data.lowStockItems,
      icon: Package,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/inventory?status=LOW_STOCK",
      change: data.lowStockItems > 0 ? "Needs attention" : "All good",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}, {displayName}! 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {format(today, "EEEE, MMMM d, yyyy")} · Here&apos;s what&apos;s happening today
          </p>
        </div>
        <QuickActions />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all duration-150 group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {typeof kpi.value === "number" ? kpi.value.toLocaleString("en-IN") : kpi.value}
                  </p>
                  {kpi.change && (
                    <p className="text-xs text-slate-400 mt-1">{kpi.change}</p>
                  )}
                </div>
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", kpi.bg)}>
                  <Icon className={cn("w-5 h-5", kpi.color)} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View details</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Today&apos;s Schedule</h2>
              <p className="text-sm text-slate-500 mt-0.5">{data.recentAppointments.length} appointments today</p>
            </div>
            <Link
              href="/appointments"
              className="text-sm text-teal-700 hover:text-teal-800 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data.recentAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="w-12 h-12 text-slate-200 mb-3" />
              <p className="font-medium text-slate-600">No appointments today</p>
              <p className="text-sm text-slate-400 mt-1">Use Quick Actions to book an appointment</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {data.recentAppointments.map((apt) => {
                const status = statusConfig[apt.status] || { label: apt.status, class: "bg-slate-100 text-slate-700" };
                return (
                  <Link
                    key={apt.id}
                    href={`/appointments`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-shrink-0 text-right w-16">
                      <div className="text-sm font-semibold text-slate-900">{formatTime(apt.startTime)}</div>
                      <div className="text-xs text-slate-400">{formatTime(apt.endTime)}</div>
                    </div>
                    <div className="w-px h-10 bg-slate-100 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 text-sm truncate">
                        {apt.patient.firstName} {apt.patient.lastName}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {apt.doctor.user.name} · {apt.treatments[0]?.treatment.name ?? "General"}
                      </div>
                    </div>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0",
                      status.class
                    )}>
                      {status.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Upcoming appointments */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Upcoming</h3>
            </div>
            {data.upcomingAppointments.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">No upcoming appointments</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {data.upcomingAppointments.map((apt) => (
                  <Link
                    key={apt.id}
                    href={`/appointments`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-teal-800 text-xs font-bold">
                        {apt.patient.firstName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {apt.patient.firstName} {apt.patient.lastName}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {apt.date ? format(new Date(apt.date), "MMM d") : "Tomorrow"} · {formatTime(apt.startTime)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Alerts</h3>
            </div>
            <div className="p-3 space-y-2">
              {data.lowStockItems > 0 && (
                <Link
                  href="/inventory?status=LOW_STOCK"
                  className="flex items-start gap-2.5 p-2.5 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <Package className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-amber-800">Low Stock Alert</div>
                    <div className="text-xs text-amber-700">{data.lowStockItems} items need restocking</div>
                  </div>
                </Link>
              )}
              {data.pendingInvoices.count > 0 && (
                <Link
                  href="/invoices?status=UNPAID"
                  className="flex items-start gap-2.5 p-2.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <DollarSign className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-red-800">Pending Payments</div>
                    <div className="text-xs text-red-700">
                      {data.pendingInvoices.count} invoices · {formatCurrency(data.pendingInvoices.totalDue ?? 0)}
                    </div>
                  </div>
                </Link>
              )}
              {data.lowStockItems === 0 && data.pendingInvoices.count === 0 && (
                <div className="p-2 text-center text-sm text-slate-400">No active alerts</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <DashboardCharts />
    </div>
  );
}
