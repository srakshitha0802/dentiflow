"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Printer,
  PieChart as PieChartIcon,
  Download,
  Activity,
  CreditCard
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { formatCurrency, cn } from "@/lib/utils";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"financial" | "appointments" | "patients">("financial");
  const [dateRange, setDateRange] = useState("30");

  const startDate = subDays(new Date(), Number(dateRange));
  const endDate = new Date();

  // Fetch Report Data based on active tab
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["report", activeTab, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("type", activeTab);
      params.append("startDate", startDate.toISOString());
      params.append("endDate", endDate.toISOString());
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Executive summaries on clinic revenue, treatment volume, and patient growth.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Filter / Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {[
            { id: "financial", label: "Financial & Revenue", icon: DollarSign },
            { id: "appointments", label: "Appointments & Volume", icon: Calendar },
            { id: "patients", label: "Patient Demographics", icon: Users },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer",
                  activeTab === t.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Period:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
            <option value="365">This Year (365D)</option>
          </select>
        </div>
      </div>

      {/* FINANCIAL REPORT TAB */}
      {activeTab === "financial" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600">Total Revenue Collected</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(reportData?.summary?.totalRevenue || 0)}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-red-600">Total Operating Expenses</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(reportData?.summary?.totalExpenses || 0)}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-blue-600">Net Operating Margin</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(reportData?.summary?.netProfit || 0)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-4">Revenue by Payment Channel</h3>
              {reportData?.paymentsByMethod?.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.paymentsByMethod}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="method" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                      <Bar dataKey="_sum.amount" name="Amount" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs">No data for selected period</div>
              )}
            </div>

            {/* Invoices by Status */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-4">Invoice Status Distribution</h3>
              {reportData?.invoicesByStatus?.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.invoicesByStatus}
                        dataKey="_sum.total"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                      >
                        {reportData.invoicesByStatus.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs">No data for selected period</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPOINTMENTS REPORT TAB */}
      {activeTab === "appointments" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-blue-600">Total Bookings</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{reportData?.summary?.total || 0}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600">Completed Rate</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {reportData?.summary?.total
                  ? Math.round(
                      ((reportData.summary.byStatus.find((s: any) => s.status === "COMPLETED")?._count._all || 0) /
                        reportData.summary.total) *
                        100
                    )
                  : 0}
                %
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Doctor Volume */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-4">Patient Volume by Specialist</h3>
              {reportData?.byDoctor?.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.byDoctor}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="doctorName" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Appointments" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs">No data for selected period</div>
              )}
            </div>

            {/* Status Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-4">Appointment Status Split</h3>
              {reportData?.summary?.byStatus?.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.summary.byStatus}
                        dataKey="_count._all"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                      >
                        {reportData.summary.byStatus.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs">No data for selected period</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PATIENTS REPORT TAB */}
      {activeTab === "patients" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-teal-600">Total Active Patients</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{reportData?.summary?.total || 0}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-purple-600">New Registrations in Period</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{reportData?.summary?.newPatients || 0}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-md">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Gender Demographics</h3>
            {reportData?.summary?.byGender?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.summary.byGender}
                      dataKey="_count._all"
                      nameKey="gender"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                    >
                      {reportData.summary.byGender.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs">No data</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
