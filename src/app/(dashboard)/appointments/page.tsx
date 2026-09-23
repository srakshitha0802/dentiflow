"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  Stethoscope,
  CheckCircle2,
  XCircle,
  PlayCircle,
  UserCheck,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Eye,
  Download,
  ExternalLink,
  ImageIcon,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pill
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatTime, appointmentStatusColors, calculateAge, cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function parseSafeDate(dateStr: string): Date {
  if (!dateStr || dateStr === "today") return new Date();
  try {
    const d = parseISO(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
}

export default function AppointmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-64 bg-slate-200 rounded-xl" />
          <div className="h-64 bg-white rounded-2xl border border-slate-200 p-6" />
        </div>
      }
    >
      <AppointmentsContent />
    </Suspense>
  );
}

interface Appointment {
  id: string;
  appointmentId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  patientId: string;
  patient: {
    id: string;
    patientId: string;
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
  };
  doctorId: string;
  doctor: {
    id: string;
    specialization: string;
    user: {
      name: string;
    };
  };
  treatments: Array<{
    id: string;
    treatment: {
      id: string;
      name: string;
      price: number;
    };
  }>;
  room?: {
    id?: string;
    name: string;
  } | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
    balanceDue: number;
  };
}

const statusBadgeStyles: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CHECKED_IN: "bg-purple-50 text-purple-700 border-purple-200",
  IN_TREATMENT: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  NO_SHOW: "bg-slate-100 text-slate-700 border-slate-200",
};

function AppointmentsContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  
  const initialDateParam = searchParams.get("date");
  const defaultDate = initialDateParam === "today" || !initialDateParam ? format(new Date(), "yyyy-MM-dd") : initialDateParam;
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Patient Reports & Case History modal state
  const [historyPatientId, setHistoryPatientId] = useState<string | null>(null);
  const [historyPatientName, setHistoryPatientName] = useState<string>("");
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  // Fetch Patient Reports & Case Dossier
  const { data: patientHistoryData, isLoading: isPatientHistoryLoading } = useQuery({
    queryKey: ["patient-history-dossier", historyPatientId],
    queryFn: async () => {
      if (!historyPatientId) return null;
      const res = await fetch(`/api/reports?type=patient-cases&patientId=${historyPatientId}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data?.patient || null;
    },
    enabled: Boolean(historyPatientId),
  });

  useEffect(() => {
    if (searchParams.get("action") === "new" || searchParams.get("new") === "true") {
      setIsNewModalOpen(true);
    }
  }, [searchParams]);

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["appointments", selectedDate, selectedStatus, selectedDoctor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDate) params.append("date", selectedDate);
      if (selectedStatus) params.append("status", selectedStatus);
      if (selectedDoctor) params.append("doctorId", selectedDoctor);
      const res = await fetch(`/api/appointments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch appointments");
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch Doctors for dropdown
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors-list"],
    queryFn: async () => {
      const res = await fetch("/api/doctors");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch Patients for new appointment modal
  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const res = await fetch("/api/patients?limit=100");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch Treatments for new appointment modal
  const { data: treatments = [] } = useQuery({
    queryKey: ["treatments-list"],
    queryFn: async () => {
      const res = await fetch("/api/treatments");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Mutation for updating status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update appointment");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success(`Appointment marked as ${variables.status.replace("_", " ")}`);
      if (selectedAppointment && selectedAppointment.id === variables.id) {
        setSelectedAppointment((prev) => prev ? { ...prev, status: variables.status } : null);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Filter appointments by search query
  const filteredAppointments = appointments.filter((apt) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${apt.patient.firstName} ${apt.patient.lastName}`.toLowerCase();
    const doctorName = apt.doctor.user.name.toLowerCase();
    const aptId = apt.appointmentId.toLowerCase();
    const phone = apt.patient.phone.toLowerCase();
    return fullName.includes(query) || doctorName.includes(query) || aptId.includes(query) || phone.includes(query);
  });

  // Form state for new appointment
  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    date: selectedDate,
    startTime: "09:00",
    endTime: "09:30",
    selectedTreatments: [] as string[],
    notes: "",
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: data.patientId,
          doctorId: data.doctorId,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          treatmentIds: data.selectedTreatments,
          notes: data.notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to schedule appointment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Appointment booked successfully!");
      setIsNewModalOpen(false);
      setFormData({
        patientId: "",
        doctorId: "",
        date: selectedDate,
        startTime: "09:00",
        endTime: "09:30",
        selectedTreatments: [],
        notes: "",
      });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId) return toast.error("Please select a patient");
    if (!formData.doctorId) return toast.error("Please select a doctor");
    if (!formData.date) return toast.error("Please pick a date");
    if (!formData.startTime) return toast.error("Please pick a start time");
    createAppointmentMutation.mutate(formData);
  };

  const handleDateChange = (offset: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + offset);
    setSelectedDate(format(current, "yyyy-MM-dd"));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-sm text-slate-500 mt-1">Manage patient bookings, clinic schedules, and chairside statuses.</p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Appointment
        </button>
      </div>

      {/* Date & Quick Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDateChange(-1)}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleDateChange(1)}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer",
                isToday(parseSafeDate(selectedDate))
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Today
            </button>
            <button
              onClick={() => {
                const tom = new Date();
                tom.setDate(tom.getDate() + 1);
                setSelectedDate(format(tom, "yyyy-MM-dd"));
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer",
                isTomorrow(parseSafeDate(selectedDate))
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Tomorrow
            </button>
          </div>

          {/* Doctor filter */}
          <div className="flex items-center gap-3">
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Doctors</option>
              {doctors.map((doc: any) => (
                <option key={doc.id} value={doc.id}>
                  {doc.user.name} ({doc.specialization.split("&")[0]})
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient / ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold text-slate-400 uppercase mr-1">Status:</span>
          {[
            { label: "All", value: "" },
            { label: "Scheduled", value: "SCHEDULED" },
            { label: "Confirmed", value: "CONFIRMED" },
            { label: "Checked In", value: "CHECKED_IN" },
            { label: "In Treatment", value: "IN_TREATMENT" },
            { label: "Completed", value: "COMPLETED" },
            { label: "Cancelled", value: "CANCELLED" },
          ].map((st) => (
            <button
              key={st.value}
              onClick={() => setSelectedStatus(st.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition whitespace-nowrap cursor-pointer",
                selectedStatus === st.value
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Appointment Cards / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900">
              Schedule for {format(parseSafeDate(selectedDate), "MMMM d, yyyy")}
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {filteredAppointments.length} Bookings
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading appointments...</div>
        ) : filteredAppointments.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <p className="font-medium text-slate-800">No appointments scheduled</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              There are no appointments matching your filter for this date. Click below to book a new appointment.
            </p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition cursor-pointer"
            >
              Book New Appointment
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAppointments.map((apt) => {
              const badgeStyle = statusBadgeStyles[apt.status] || "bg-slate-100 text-slate-700";
              return (
                <div
                  key={apt.id}
                  className="p-5 sm:p-6 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left info: Time & Patient */}
                  <div className="flex items-start gap-4">
                    <div className="w-20 text-center bg-slate-50 border border-slate-200 rounded-xl p-2 flex-shrink-0">
                      <div className="text-sm font-bold text-slate-900">{formatTime(apt.startTime)}</div>
                      <div className="text-[11px] text-slate-500">{formatTime(apt.endTime)}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/patients`}
                          className="font-bold text-slate-900 hover:text-blue-600 text-base transition"
                        >
                          {apt.patient.firstName} {apt.patient.lastName}
                        </Link>
                        <span className="text-xs text-slate-400 font-mono">({apt.patient.patientId})</span>
                        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", badgeStyle)}>
                          {apt.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                          {apt.doctor.user.name} ({apt.doctor.specialization})
                        </span>
                        <span>·</span>
                        <span>Phone: {apt.patient.phone}</span>
                        {apt.room && (
                          <>
                            <span>·</span>
                            <span className="font-medium text-slate-700">{apt.room.name}</span>
                          </>
                        )}
                      </div>

                      {apt.treatments && apt.treatments.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-xs text-slate-400">Treatments:</span>
                          {apt.treatments.map((t) => (
                            <span
                              key={t.id}
                              className="inline-block bg-blue-50 text-blue-700 text-[11px] font-medium px-2 py-0.5 rounded-md"
                            >
                              {t.treatment.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {apt.notes && (
                        <p className="text-xs text-slate-500 italic mt-1 bg-amber-50/60 p-1.5 rounded-md border border-amber-100">
                          Note: {apt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                    {/* Action progression based on current status */}
                    {apt.status === "SCHEDULED" && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "CONFIRMED" })}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition cursor-pointer"
                      >
                        Confirm
                      </button>
                    )}

                    {(apt.status === "SCHEDULED" || apt.status === "CONFIRMED") && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "CHECKED_IN" })}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Check In
                      </button>
                    )}

                    {apt.status === "CHECKED_IN" && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "IN_TREATMENT" })}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Start Treatment
                      </button>
                    )}

                    {apt.status === "IN_TREATMENT" && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "COMPLETED" })}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete Treatment
                      </button>
                    )}

                    {apt.status === "COMPLETED" && (
                      <Link
                        href={`/invoices?action=new&patientId=${apt.patient.id}&appointmentId=${apt.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Create Invoice
                      </Link>
                    )}

                    {apt.status !== "CANCELLED" && apt.status !== "COMPLETED" && (
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to cancel this appointment?")) {
                            updateStatusMutation.mutate({ id: apt.id, status: "CANCELLED" });
                          }
                        }}
                        className="px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Cancel Appointment"
                      >
                        Cancel
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setHistoryPatientId(apt.patient.id);
                        setHistoryPatientName(`${apt.patient.firstName} ${apt.patient.lastName}`);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition cursor-pointer"
                      title="View Clinical Reports, Previous Files & Diagnoses"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
                      Reports & Files
                    </button>

                    <button
                      onClick={() => {
                        setSelectedAppointment(apt);
                        setIsDetailModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: New Appointment */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Book New Appointment</h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
              {/* Patient Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Select Patient <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.patientId}) - {p.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Doctor / Specialist <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.doctorId}
                  onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.user.name} — {d.specialization}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Times */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Treatment Multi-select checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                  Planned Treatments
                </label>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/50">
                  {treatments.map((t: any) => {
                    const isChecked = formData.selectedTreatments.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition",
                          isChecked
                            ? "bg-blue-50 border-blue-200 text-blue-900 font-semibold"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedTreatments: [...formData.selectedTreatments, t.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                selectedTreatments: formData.selectedTreatments.filter((id) => id !== t.id),
                              });
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{t.name}</span>
                        <span className="ml-auto text-slate-400">{formatCurrency(t.price)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Appointment Notes / Symptoms
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Chief complaint: toothache lower left molar..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAppointmentMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  {createAppointmentMutation.isPending ? "Booking..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Appointment Details View */}
      {isDetailModalOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-400 font-mono">#{selectedAppointment.appointmentId}</span>
                <h3 className="text-lg font-bold text-slate-900">Appointment Overview</h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-sm">
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-base">
                    {selectedAppointment.patient.firstName} {selectedAppointment.patient.lastName}
                  </div>
                  <div className="text-xs text-slate-500">Phone: {selectedAppointment.patient.phone}</div>
                </div>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold border",
                    statusBadgeStyles[selectedAppointment.status]
                  )}
                >
                  {selectedAppointment.status.replace("_", " ")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 border border-slate-100 rounded-xl">
                  <span className="text-slate-400 block mb-1">Doctor</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedAppointment.doctor.user.name}
                  </span>
                  <div className="text-slate-500 mt-0.5">{selectedAppointment.doctor.specialization}</div>
                </div>
                <div className="p-3 border border-slate-100 rounded-xl">
                  <span className="text-slate-400 block mb-1">Schedule Time</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {format(parseISO(selectedAppointment.date), "MMM d, yyyy")}
                  </span>
                  <div className="text-slate-500 mt-0.5">
                    {formatTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}
                  </div>
                </div>
              </div>

              {selectedAppointment.treatments && selectedAppointment.treatments.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Treatments</span>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {selectedAppointment.treatments.map((t) => (
                      <div key={t.id} className="p-2.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">{t.treatment.name}</span>
                        <span className="font-bold text-slate-900">{formatCurrency(t.treatment.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedAppointment.notes && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Doctor Notes</span>
                  <p className="p-3 bg-amber-50/70 border border-amber-200 text-amber-900 text-xs rounded-xl">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const pId = selectedAppointment.patient.id;
                    const pName = `${selectedAppointment.patient.firstName} ${selectedAppointment.patient.lastName}`;
                    setIsDetailModalOpen(false);
                    setHistoryPatientId(pId);
                    setHistoryPatientName(pName);
                  }}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Previous Reports & Files
                </button>
                <Link
                  href={`/invoices?action=new&patientId=${selectedAppointment.patient.id}&appointmentId=${selectedAppointment.id}`}
                  className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Invoice
                </Link>
              </div>

              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Patient Previous Reports & Clinical Dossier View */}
      {historyPatientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
                  Clinical Case Dossier & Previous Reports
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  {historyPatientName} {patientHistoryData?.patientId ? `(${patientHistoryData.patientId})` : ""}
                </h3>
              </div>
              <button
                onClick={() => setHistoryPatientId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isPatientHistoryLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Retrieving patient medical reports, previous consultation records, and files...
              </div>
            ) : !patientHistoryData ? (
              <div className="p-8 bg-slate-50 rounded-xl text-center border border-slate-200 text-sm text-slate-500">
                No past reports or history found for this patient.
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Patient Summary Header */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-slate-400 block">Age & Gender</span>
                    <span className="font-bold text-slate-800">
                      {calculateAge(new Date(patientHistoryData.dateOfBirth))} yrs, {patientHistoryData.gender}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Phone</span>
                    <span className="font-bold text-slate-800">{patientHistoryData.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Visits</span>
                    <span className="font-bold text-indigo-700">{patientHistoryData.appointments?.length || 0} Consultations</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Diagnostic Files</span>
                    <span className="font-bold text-emerald-700">{patientHistoryData.documents?.length || 0} Attached</span>
                  </div>
                </div>

                {/* Medical History & Allergies Alert */}
                {patientHistoryData.medicalHistory && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1 text-slate-700">
                    <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wide">
                      Medical Background & Alerts
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                      <div>
                        <span className="font-semibold text-slate-900">Allergies: </span>
                        {patientHistoryData.medicalHistory.allergies || "None declared"}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Conditions: </span>
                        {patientHistoryData.medicalHistory.conditions || "None reported"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Attached Files & Diagnostic Scans */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 uppercase tracking-wide">
                      Uploaded Diagnostic Reports & Scans ({patientHistoryData.documents?.length || 0})
                    </span>
                  </div>

                  {(!patientHistoryData.documents || patientHistoryData.documents.length === 0) ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 italic">
                      No X-rays or diagnostic files uploaded for this patient yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {patientHistoryData.documents.map((doc: any) => {
                        const isImg = doc.mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.url);
                        return (
                          <div
                            key={doc.id}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                                {isImg ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate">{doc.name}</div>
                                <div className="text-[10px] text-slate-400">
                                  {doc.type?.replace(/_/g, " ")} • {format(parseISO(doc.uploadedAt), "MMM d, yyyy")}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isImg && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Preview"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <a
                                href={doc.url}
                                download={doc.name}
                                className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Previous Appointments & Doctor Diagnoses */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-900 uppercase tracking-wide">
                    Previous Consultations & Doctor Notes ({patientHistoryData.appointments?.length || 0})
                  </span>

                  {(!patientHistoryData.appointments || patientHistoryData.appointments.length === 0) ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 italic">
                      No previous consultations recorded.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {patientHistoryData.appointments.map((apt: any) => (
                        <div
                          key={apt.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {format(parseISO(apt.date), "MMMM d, yyyy")}
                              </span>
                              <span className="text-slate-500">({apt.startTime} - {apt.endTime})</span>
                              <span className="px-1.5 py-0.2 bg-white text-slate-700 border border-slate-200 rounded text-[10px] font-semibold">
                                {apt.status}
                              </span>
                            </div>
                            <span className="text-slate-600 font-medium">
                              Dr. {apt.doctor?.user?.name || "Dentist"}
                            </span>
                          </div>

                          {apt.treatments && apt.treatments.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {apt.treatments.map((t: any) => (
                                <span
                                  key={t.id}
                                  className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded text-[10px] font-medium"
                                >
                                  {t.treatment?.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {apt.notes && (
                            <div className="p-2 bg-white rounded border border-slate-200 text-slate-700 italic">
                              <span className="font-semibold not-italic text-slate-900">Doctor Note: </span>
                              {apt.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prescriptions */}
                {patientHistoryData.prescriptions && patientHistoryData.prescriptions.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-900 uppercase tracking-wide">
                      Prescribed Medications ({patientHistoryData.prescriptions.length})
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {patientHistoryData.prescriptions.map((rx: any) => (
                        <div key={rx.id} className="p-2 bg-amber-50/50 border border-amber-200 rounded-lg">
                          <div className="flex items-center justify-between font-bold text-amber-900 mb-1">
                            <span>Rx #{rx.prescriptionId} • {format(parseISO(rx.date || rx.createdAt), "MMM d, yyyy")}</span>
                            <span>Dr. {rx.doctor?.user?.name}</span>
                          </div>
                          {rx.items?.map((it: any) => (
                            <div key={it.id} className="text-slate-800 text-[11px]">
                              • <span className="font-semibold">{it.medicineName}</span> ({it.dosage}) - {it.frequency}, {it.duration}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Link
                href={`/reports?tab=patient-cases&patientId=${historyPatientId}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Full Printable Case Dossier
              </Link>
              <button
                onClick={() => setHistoryPatientId(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-sm text-slate-900">{previewDoc.name}</span>
              <button onClick={() => setPreviewDoc(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-950 rounded-xl p-2 flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewDoc.url} alt={previewDoc.name} className="max-h-[55vh] object-contain rounded-lg" />
            </div>
            <div className="flex justify-end pt-1">
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition"
              >
                Open Full Size
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
