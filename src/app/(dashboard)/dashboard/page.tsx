import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate, formatTime, appointmentStatusColors } from "@/lib/utils";

type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "CHECKED_IN" | "IN_TREATMENT" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
import Link from "next/link";
import {
  Calendar,
  Users,
  UserPlus,
  DollarSign,
  TrendingUp,
  Package,
  ArrowRight,
  Clock,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import QuickActions from "@/components/dashboard/QuickActions";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from "date-fns";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

async function getDashboardData(userId: string) {
  const today = new Date();
  const startToday = startOfDay(today);
  const endToday = endOfDay(today);
  const startMonth = startOfMonth(today);
  const endMonth = endOfMonth(today);
  const thirtyDaysAgo = subDays(today, 30);

  const [
    todayAppointments,
    totalPatients,
    newPatientsThisMonth,
    pendingInvoices,
    todayRevenue,
    lowStockItems,
    recentAppointments,
    monthlyRevenue,
    upcomingAppointments,
  ] = await Promise.all([
    prisma.appointment.count({ where: { date: { gte: startToday, lte: endToday } } }),
    prisma.patient.count({ where: { status: "ACTIVE" } }),
    prisma.patient.count({ where: { createdAt: { gte: startMonth, lte: endMonth } } }),
    prisma.invoice.aggregate({
      where: { status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
      _sum: { balanceDue: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { date: { gte: startToday, lte: endToday } },
      _sum: { amount: true },
    }),
    prisma.inventoryItem.count({ where: { status: { in: ["LOW_STOCK", "OUT_OF_STOCK"] } } }),
    prisma.appointment.findMany({
      where: { date: { gte: startToday, lte: endToday } },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        doctor: { include: { user: { select: { name: true } } } },
        treatments: { include: { treatment: { select: { name: true } } } },
      },
      orderBy: { startTime: "asc" },
      take: 10,
    }),
    // Revenue last 7 days for charts
    prisma.payment.groupBy({
      by: ["date"],
      where: { date: { gte: subDays(today, 6) } },
      _sum: { amount: true },
    }),
    prisma.appointment.findMany({
      where: {
        date: { gte: startToday },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        doctor: { include: { user: { select: { name: true } } } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 5,
    }),
  ]);

  return {
    todayAppointments,
    totalPatients,
    newPatientsThisMonth,
    pendingInvoices,
    todayRevenue: todayRevenue._sum.amount ?? 0,
    lowStockItems,
    recentAppointments,
    monthlyRevenue,
    upcomingAppointments,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const data = await getDashboardData(session.user.id);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date();

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
      value: formatCurrency(data.pendingInvoices._sum?.balanceDue ?? 0),
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/invoices?status=UNPAID",
      change: `${data.pendingInvoices._count} invoices`,
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

  const statusConfig: Record<AppointmentStatus, { label: string; class: string }> = {
    SCHEDULED: { label: "Scheduled", class: "bg-blue-100 text-blue-700" },
    CONFIRMED: { label: "Confirmed", class: "bg-emerald-100 text-emerald-700" },
    CHECKED_IN: { label: "Checked In", class: "bg-purple-100 text-purple-700" },
    IN_TREATMENT: { label: "In Treatment", class: "bg-amber-100 text-amber-700" },
    COMPLETED: { label: "Completed", class: "bg-green-100 text-green-700" },
    CANCELLED: { label: "Cancelled", class: "bg-red-100 text-red-700" },
    NO_SHOW: { label: "No Show", class: "bg-gray-100 text-gray-600" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {session.user.name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-slate-500 mt-1">
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
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
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
                const status = statusConfig[apt.status as AppointmentStatus] || { label: apt.status, class: "badge-default" };
                return (
                  <Link
                    key={apt.id}
                    href={`/appointments/${apt.id}`}
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
                      "px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
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
                    href={`/appointments/${apt.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 text-xs font-bold">
                        {apt.patient.firstName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {apt.patient.firstName} {apt.patient.lastName}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {format(new Date(apt.date), "MMM d")} · {formatTime(apt.startTime)}
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
              {(data.pendingInvoices._count ?? 0) > 0 && (
                <Link
                  href="/invoices?status=UNPAID"
                  className="flex items-start gap-2.5 p-2.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <DollarSign className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-red-800">Pending Payments</div>
                    <div className="text-xs text-red-700">
                      {data.pendingInvoices._count} invoices · {formatCurrency(data.pendingInvoices._sum?.balanceDue ?? 0)}
                    </div>
                  </div>
                </Link>
              )}
              {data.lowStockItems === 0 && (data.pendingInvoices._count ?? 0) === 0 && (
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
