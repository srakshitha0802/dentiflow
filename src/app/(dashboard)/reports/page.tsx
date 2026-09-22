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
  CreditCard,
  FileText,
  Search,
  Eye,
  X,
  ExternalLink,
  Pill,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  ImageIcon
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
import { formatCurrency, calculateAge, cn } from "@/lib/utils";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"financial" | "appointments" | "patients" | "patient-cases">("financial");
  const [dateRange, setDateRange] = useState("30");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [previewDocModal, setPreviewDocModal] = useState<any | null>(null);

  const startDate = subDays(new Date(), Number(dateRange));
  const endDate = new Date();

  // Fetch Report Data based on active tab
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["report", activeTab, dateRange, patientSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("type", activeTab);
      params.append("startDate", startDate.toISOString());
      params.append("endDate", endDate.toISOString());
      if (activeTab === "patient-cases" && patientSearch) {
        params.append("search", patientSearch);
      }
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
  });

  // Fetch Single Patient Dossier for Detail Modal
  const { data: patientDossierData, isLoading: isDossierLoading } = useQuery({
    queryKey: ["patient-case-dossier", selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return null;
      const res = await fetch(`/api/reports?type=patient-cases&patientId=${selectedPatientId}`);
      if (!res.ok) throw new Error("Failed to load patient dossier");
      return res.json();
    },
    enabled: Boolean(selectedPatientId),
  });

  const patientDossier = patientDossierData?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Clinical case reports, previous diagnostic files, revenue summaries, and treatment records.
          </p>
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
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: "financial", label: "Financial & Revenue", icon: DollarSign },
            { id: "appointments", label: "Appointments & Volume", icon: Calendar },
            { id: "patients", label: "Patient Demographics", icon: Users },
            { id: "patient-cases", label: "Patient Clinical & Previous Reports", icon: FileText },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap",
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

        {activeTab !== "patient-cases" && (
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
        )}
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

      {/* PATIENT CLINICAL & CASE REPORTS TAB */}
      {activeTab === "patient-cases" && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient by name, phone number, or ID..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Click any patient to inspect their full case history, previous diagnostic files & X-Rays.
            </div>
          </div>

          {/* Patient Cases List */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading patient clinical reports...</div>
          ) : !reportData?.data || reportData?.data?.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No patient reports found</h3>
              <p className="text-xs text-slate-400">Try searching by a different name or phone number.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.data.map((p: any) => {
                const latestNote = p.clinicalNotes?.[0];
                const latestDoc = p.documents?.[0];
                const totalDocs = p._count?.documents || 0;
                const totalVisits = p._count?.appointments || 0;

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-teal-400 transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Patient Top Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {p.patientId}</span>
                          <h3 className="text-base font-bold text-slate-900">
                            {p.firstName} {p.lastName}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {calculateAge(new Date(p.dateOfBirth))} yrs, {p.gender} • {p.phone}
                          </p>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          {totalVisits} Visit{totalVisits === 1 ? "" : "s"}
                        </span>
                      </div>

                      {/* Medical History Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        {p.medicalHistory?.allergies && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-semibold">
                            Allergies: {p.medicalHistory.allergies}
                          </span>
                        )}
                        {p.medicalHistory?.diabetes && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-semibold">
                            Diabetic
                          </span>
                        )}
                        {p.medicalHistory?.hypertension && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-semibold">
                            Hypertension
                          </span>
                        )}
                      </div>

                      {/* Latest Clinical Diagnosis */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700">Latest Doctor Note</span>
                          {latestNote && (
                            <span className="text-slate-400 text-[10px]">
                              {format(parseISO(latestNote.createdAt), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                        {latestNote ? (
                          <p className="text-slate-600 line-clamp-2 italic">
                            &ldquo;{latestNote.diagnosis || latestNote.chiefComplaint || latestNote.treatmentDone || "Routine follow-up"}&rdquo;
                          </p>
                        ) : (
                          <p className="text-slate-400 italic">No notes recorded yet</p>
                        )}
                      </div>

                      {/* Previous Reports & Files indicator */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-1.5 text-teal-800 font-semibold">
                          <FileText className="w-4 h-4 text-teal-700" />
                          <span>{totalDocs} Diagnostic File{totalDocs === 1 ? "" : "s"} & X-Rays</span>
                        </div>

                        {latestDoc && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {latestDoc.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* View Dossier Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedPatientId(p.id)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Full Case History & Reports</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: FULL PATIENT CASE DOSSIER */}
      {selectedPatientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Dossier Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold rounded-md">
                    CLINICAL CASE REPORT
                  </span>
                  {patientDossier && (
                    <span className="text-xs text-slate-400 font-mono">
                      ID: {patientDossier.patientId}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  {patientDossier?.firstName} {patientDossier?.lastName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Age: {patientDossier && calculateAge(new Date(patientDossier.dateOfBirth))} yrs • Gender: {patientDossier?.gender} • Phone: {patientDossier?.phone} • Blood Group: {patientDossier?.bloodGroup || "O+"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Case Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPatientId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {isDossierLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading full case dossier...</div>
            ) : !patientDossier ? (
              <div className="p-12 text-center text-slate-400 text-sm">Patient record not found</div>
            ) : (
              <div className="space-y-6 text-xs">
                {/* Medical Alerts Summary */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] block">KNOWN ALLERGIES</span>
                    <span className="font-bold text-red-600 text-xs">
                      {patientDossier.medicalHistory?.allergies || "None reported"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] block">SYSTEMIC CONDITIONS</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {patientDossier.medicalHistory?.conditions ||
                        (patientDossier.medicalHistory?.diabetes ? "Diabetes " : "") +
                        (patientDossier.medicalHistory?.hypertension ? "Hypertension" : "") ||
                        "None reported"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] block">EMERGENCY CONTACT</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {patientDossier.emergencyContact
                        ? `${patientDossier.emergencyContact.name} (${patientDossier.emergencyContact.relationship}) - ${patientDossier.emergencyContact.phone}`
                        : "Not specified"}
                    </span>
                  </div>
                </div>

                {/* Section 1: Attached Diagnostic Reports & X-Rays */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-700" />
                      <span>Previous Diagnostic Reports & X-Rays ({patientDossier.documents?.length || 0})</span>
                    </h3>
                  </div>

                  {patientDossier.documents?.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400">
                      No files or diagnostic scans attached.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {patientDossier.documents.map((doc: any) => {
                        const isImage = doc.mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.url);
                        const isSelfUpload = doc.uploadedBy?.toLowerCase().includes("patient");

                        return (
                          <div
                            key={doc.id}
                            className="p-3 bg-white border border-slate-200 rounded-xl hover:border-teal-300 transition flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                                {isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block truncate">{doc.name}</span>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-semibold">
                                    {doc.type?.replace(/_/g, " ")}
                                  </span>
                                  <span className="ml-1.5">
                                    {isSelfUpload ? "• Patient Self-Upload" : `• ${doc.uploadedBy || "Clinic Staff"}`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isImage) {
                                    setPreviewDocModal(doc);
                                  } else {
                                    window.open(doc.url, "_blank");
                                  }
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Preview</span>
                              </button>

                              <a
                                href={doc.url}
                                download={doc.name}
                                className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section 2: Chronological Clinical Notes & Diagnoses */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-teal-700" />
                      <span>Clinical Visit Notes & Doctor Diagnoses ({patientDossier.clinicalNotes?.length || 0})</span>
                    </h3>
                  </div>

                  {patientDossier.clinicalNotes?.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400">
                      No clinical notes recorded yet for this patient.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {patientDossier.clinicalNotes.map((note: any) => (
                        <div key={note.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div>
                              <span className="font-bold text-slate-900 text-xs">
                                Doctor: Dr. {note.doctor?.user?.name || note.author?.name || "Consulting Dentist"}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {format(parseISO(note.createdAt), "MMM d, yyyy, h:mm a")}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {note.chiefComplaint && (
                              <div>
                                <span className="font-semibold text-slate-500 block">Chief Complaint:</span>
                                <span className="text-slate-800">{note.chiefComplaint}</span>
                              </div>
                            )}
                            {note.diagnosis && (
                              <div>
                                <span className="font-semibold text-slate-500 block">Diagnosis:</span>
                                <span className="text-slate-800 font-semibold">{note.diagnosis}</span>
                              </div>
                            )}
                            {note.treatmentDone && (
                              <div>
                                <span className="font-semibold text-slate-500 block">Treatment Performed:</span>
                                <span className="text-slate-800">{note.treatmentDone}</span>
                              </div>
                            )}
                            {note.recommendations && (
                              <div>
                                <span className="font-semibold text-slate-500 block">Doctor Recommendations:</span>
                                <span className="text-slate-800">{note.recommendations}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 3: Past Prescriptions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Pill className="w-4 h-4 text-amber-600" />
                      <span>Previous Prescriptions ({patientDossier.prescriptions?.length || 0})</span>
                    </h3>
                  </div>

                  {patientDossier.prescriptions?.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400">
                      No prescriptions generated yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {patientDossier.prescriptions.map((rx: any) => (
                        <div key={rx.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 font-mono text-[11px]">{rx.prescriptionId}</span>
                            <span className="text-[10px] text-slate-400">{format(parseISO(rx.date), "MMM d, yyyy")}</span>
                          </div>

                          <div className="space-y-1">
                            {rx.items?.map((it: any, idx: number) => (
                              <div key={idx} className="p-1.5 bg-slate-50 rounded text-[11px] flex items-center justify-between">
                                <span className="font-bold text-slate-800">{it.medication}</span>
                                <span className="text-slate-500">{it.dosage} • {it.frequency}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dossier Footer */}
            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedPatientId(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW LIGHTBOX */}
      {previewDocModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{previewDocModal.name}</h3>
                <p className="text-[11px] text-slate-400">{previewDocModal.type?.replace(/_/g, " ")}</p>
              </div>
              <button
                onClick={() => setPreviewDocModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl bg-slate-950 flex items-center justify-center p-2 min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewDocModal.url}
                alt={previewDocModal.name}
                className="max-h-[60vh] max-w-full object-contain rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={previewDocModal.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </a>

              <button
                onClick={() => setPreviewDocModal(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

