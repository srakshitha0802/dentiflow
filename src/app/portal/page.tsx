"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, addDays } from "date-fns";
import {
  User,
  Phone,
  Calendar,
  CreditCard,
  FileText,
  Clock,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowRight,
  LogOut,
  Sparkles,
  ShieldCheck,
  Stethoscope,
  Pill,
  DollarSign,
  QrCode,
  Check,
  ChevronRight,
  Receipt,
  CalendarCheck,
  Upload,
  FileUp,
  Download,
  Trash2,
  Star,
  MessageSquareHeart,
  Eye,
  Paperclip,
  ImageIcon,
  FileCheck,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import ClientNavbar from "@/components/client/ClientNavbar";
import ClientFooter from "@/components/client/ClientFooter";
import { formatCurrency, cn } from "@/lib/utils";
import Link from "next/link";

export default function PatientPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFBFB] text-slate-500 text-sm font-medium">
          Loading patient portal...
        </div>
      }
    >
      <PatientPortalContent />
    </Suspense>
  );
}

function PatientPortalContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Identifier state (phone, email, or patientId)
  const [identifierInput, setIdentifierInput] = useState(
    searchParams.get("phone") || searchParams.get("id") || ""
  );
  const [activeIdentifier, setActiveIdentifier] = useState(
    searchParams.get("phone") || searchParams.get("id") || ""
  );

  // Restore session from localStorage if no query parameter provided
  useEffect(() => {
    if (!activeIdentifier && typeof window !== "undefined") {
      const stored = localStorage.getItem("patientIdentifier");
      if (stored) {
        setIdentifierInput(stored);
        setActiveIdentifier(stored);
      }
    }
  }, [activeIdentifier]);

  // Persist session when activeIdentifier changes
  useEffect(() => {
    if (activeIdentifier && typeof window !== "undefined") {
      localStorage.setItem("patientIdentifier", activeIdentifier);
    }
  }, [activeIdentifier]);

  // Active Tab: "appointments" | "invoices" | "prescriptions" | "treatment-plans" | "documents" | "feedback"
  const [activeTab, setActiveTab] = useState<string>("appointments");

  // Modals
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [previewDocModal, setPreviewDocModal] = useState<any | null>(null);

  // Selected entities for modals
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState<string>(
    format(addDays(new Date(), 1), "yyyy-MM-dd")
  );
  const [rescheduleSlot, setRescheduleSlot] = useState<{
    startTime: string;
    endTime: string;
  } | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");

  // Cancel state
  const [cancelReason, setCancelReason] = useState("");

  // Online Payment state
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>("UPI");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Document Upload State
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("PREVIOUS_RECORD");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState(0);
  const [feedbackCategory, setFeedbackCategory] = useState("GENERAL");
  const [feedbackTreatment, setFeedbackTreatment] = useState("");
  const [feedbackDoctor, setFeedbackDoctor] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Fetch Patient Portal Data
  const {
    data: portalData,
    isLoading: portalLoading,
    refetch: refetchPortal,
    isError,
  } = useQuery({
    queryKey: ["patient-portal", activeIdentifier],
    queryFn: async () => {
      if (!activeIdentifier) return null;
      const res = await fetch(`/api/patient/portal?identifier=${encodeURIComponent(activeIdentifier)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "No patient record found for this identifier.");
      }
      return res.json();
    },
    enabled: Boolean(activeIdentifier && typeof window !== "undefined"),
    retry: false,
  });


  // Fetch Slots for Reschedule Modal
  const { data: rescheduleSlotsData, isLoading: rescheduleSlotsLoading } = useQuery({
    queryKey: ["reschedule-slots", rescheduleDate, selectedAppointment?.doctorId],
    queryFn: async () => {
      if (!rescheduleDate || !selectedAppointment?.doctorId) return { slots: [] };
      const res = await fetch(
        `/api/public/slots?date=${rescheduleDate}&doctorId=${selectedAppointment.doctorId}`
      );
      if (!res.ok) return { slots: [] };
      return res.json();
    },
    enabled: Boolean(rescheduleModalOpen && selectedAppointment && rescheduleDate),
  });

  const rescheduleSlots = rescheduleSlotsData?.slots || [];

  // Reschedule Mutation
  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!rescheduleSlot) throw new Error("Please select a new time slot.");
      const res = await fetch(`/api/patient/appointments/${selectedAppointment.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: rescheduleDate,
          startTime: rescheduleSlot.startTime,
          endTime: rescheduleSlot.endTime,
          reason: rescheduleReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reschedule appointment.");
      return json;
    },
    onSuccess: () => {
      toast.success("Appointment rescheduled successfully!");
      setRescheduleModalOpen(false);
      refetchPortal();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patient/appointments/${selectedAppointment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to cancel appointment.");
      return json;
    },
    onSuccess: () => {
      toast.success("Appointment cancelled successfully.");
      setCancelModalOpen(false);
      refetchPortal();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Online Pay Mutation
  const payMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInvoice || payAmount <= 0) {
        throw new Error("Please enter a valid payment amount.");
      }
      setIsProcessingPayment(true);
      await new Promise((r) => setTimeout(r, 800));

      const res = await fetch(`/api/patient/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: payAmount,
          method: payMethod,
          referenceNumber: `${payMethod}-${Date.now().toString().slice(-6)}`,
          notes: `Online patient portal payment via ${payMethod}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Payment processing failed.");
      return json;
    },
    onSuccess: () => {
      setIsProcessingPayment(false);
      toast.success("Payment confirmed successfully!");
      setPaymentModalOpen(false);
      refetchPortal();
    },
    onError: (err: Error) => {
      setIsProcessingPayment(false);
      toast.error(err.message);
    },
  });

  // Document Upload Mutation
  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!docFile) throw new Error("Please select a file to upload.");
      if (docFile.size > 15 * 1024 * 1024) throw new Error("File size must be under 15MB.");

      setIsUploadingDoc(true);
      const formData = new FormData();
      formData.append("file", docFile);
      formData.append("identifier", activeIdentifier);
      formData.append("patientId", portalData?.patient?.id || "");
      formData.append("name", docName.trim() || docFile.name);
      formData.append("type", docType);

      const res = await fetch("/api/patient/documents", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to upload document.");
      return json;
    },
    onSuccess: () => {
      setIsUploadingDoc(false);
      setDocFile(null);
      setDocName("");
      toast.success("Document uploaded successfully! It is now accessible to all your doctors and clinical staff.");
      refetchPortal();
      queryClient.invalidateQueries({ queryKey: ["patient-documents"] });
    },
    onError: (err: Error) => {
      setIsUploadingDoc(false);
      toast.error(err.message);
    },
  });

  // Delete Document Mutation
  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/patient/documents?id=${docId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete document.");
      return json;
    },
    onSuccess: () => {
      toast.success("Document removed successfully.");
      refetchPortal();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Submit Feedback Mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async () => {
      if (!feedbackRating) throw new Error("Please select a star rating.");
      if (!feedbackComment || feedbackComment.trim().length < 5) {
        throw new Error("Please write a brief feedback comment (at least 5 characters).");
      }

      setIsSubmittingFeedback(true);
      const res = await fetch("/api/patient/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: activeIdentifier,
          patientId: portalData?.patient?.id,
          patientName: `${portalData?.patient?.firstName} ${portalData?.patient?.lastName}`,
          patientPhone: portalData?.patient?.phone,
          rating: feedbackRating,
          category: feedbackCategory,
          treatment: feedbackTreatment || undefined,
          doctorName: feedbackDoctor || undefined,
          comment: feedbackComment.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit feedback.");
      return json;
    },
    onSuccess: () => {
      setIsSubmittingFeedback(false);
      setFeedbackComment("");
      setFeedbackTreatment("");
      setFeedbackDoctor("");
      setFeedbackRating(5);
      toast.success("Thank you! Your feedback has been published and updated across our clinic portal.");
      refetchPortal();
      queryClient.invalidateQueries({ queryKey: ["public-feedback"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-feedbacks"] });
    },
    onError: (err: Error) => {
      setIsSubmittingFeedback(false);
      toast.error(err.message);
    },
  });

  const patient = portalData?.patient;
  const appointments = portalData?.appointments || [];
  const invoices = portalData?.invoices || [];
  const prescriptions = portalData?.prescriptions || [];
  const treatmentPlans = portalData?.treatmentPlans || [];
  const documents = portalData?.documents || [];
  const feedbacks = portalData?.feedbacks || [];

  const upcomingAppointments = appointments.filter(
    (a: any) => a.status === "SCHEDULED" || a.status === "CONFIRMED"
  );
  const pastAppointments = appointments.filter(
    (a: any) => a.status !== "SCHEDULED" && a.status !== "CONFIRMED"
  );

  const totalOutstandingBalance = invoices.reduce(
    (sum: number, inv: any) => sum + (inv.balanceDue || 0),
    0
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFB] text-slate-900">
      <ClientNavbar />

      <main className="flex-1 py-10 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* LOOKUP / LOGIN STATE */}
          {!patient ? (
            <div className="max-w-md mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-xs border border-slate-200 text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border border-teal-100">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  Patient Self-Service
                </span>
                <h1 className="text-2xl font-black text-slate-800 mt-1">Patient Portal Login</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  Enter your registered Phone Number, Email, or Patient ID to access your upcoming visits, bills, and dental records.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!identifierInput.trim()) {
                    return toast.error("Please enter your Phone Number, Email, or Patient ID.");
                  }
                  setActiveIdentifier(identifierInput.trim());
                }}
                className="space-y-4 text-left"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Phone Number / Email / Patient ID
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9811111111 or patient@email.com"
                      value={identifierInput}
                      onChange={(e) => setIdentifierInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={portalLoading}
                  className="w-full py-3 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {portalLoading ? (
                    <span>Verifying Records...</span>
                  ) : (
                    <>
                      <span>Access My Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 text-xs text-slate-400">
                New to DentalCare Pro?{" "}
                <Link href="/book" className="text-teal-700 font-bold hover:underline">
                  Book Your First Appointment
                </Link>
              </div>
            </div>
          ) : (
            /* PATIENT PORTAL DASHBOARD IN SOFT PASTEL COLORS */
            <div className="space-y-6">
              {/* Top Greeting Banner */}
              <div className="bg-gradient-to-r from-teal-700 via-cyan-700 to-sky-700 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-black text-white shadow-inner">
                    {patient.firstName?.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-black tracking-tight">
                        Welcome, {patient.firstName} {patient.lastName}
                      </h1>
                      <span className="px-2 py-0.5 bg-teal-400/20 text-teal-100 border border-teal-300/30 text-[10px] font-bold rounded-md">
                        {patient.patientId}
                      </span>
                    </div>
                    <p className="text-xs text-teal-100 mt-1 flex items-center gap-3">
                      <span>Phone: {patient.phone}</span>
                      {patient.email && <span>• {patient.email}</span>}
                      {patient.bloodGroup && <span>• Blood: {patient.bloodGroup}</span>}
                    </p>
                  </div>
                </div>

                {/* Right Balance & Exit */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <span className="text-[11px] text-teal-200 block font-medium">Balance Due</span>
                    <span className="text-xl font-black text-white font-mono">
                      {formatCurrency(totalOutstandingBalance)}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("patientIdentifier");
                      }
                      setActiveIdentifier("");
                      setIdentifierInput("");
                    }}
                    className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                    title="Sign Out of Portal"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              </div>

              {/* Navigation Tabs with Pastel Badges */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
                {[
                  {
                    id: "appointments",
                    label: "Appointments",
                    icon: Calendar,
                    badge: upcomingAppointments.length,
                  },
                  {
                    id: "invoices",
                    label: "Bills & Invoices",
                    icon: CreditCard,
                    badge: invoices.filter((i: any) => i.balanceDue > 0).length,
                  },
                  {
                    id: "prescriptions",
                    label: "Prescriptions",
                    icon: Pill,
                    badge: prescriptions.length,
                  },
                  {
                    id: "treatment-plans",
                    label: "Treatment Plans",
                    icon: Stethoscope,
                    badge: treatmentPlans.length,
                  },
                  {
                    id: "documents",
                    label: "Medical Records & Files",
                    icon: FileText,
                    badge: documents.length,
                  },
                  {
                    id: "feedback",
                    label: "Feedback & Reviews",
                    icon: Star,
                    badge: feedbacks.length,
                  },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer",
                        isSelected
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {tab.badge > 0 && (
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                            isSelected ? "bg-teal-500 text-white" : "bg-teal-100 text-teal-800"
                          )}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: APPOINTMENTS */}
              {activeTab === "appointments" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Your Appointments</h2>
                      <p className="text-xs text-slate-500">
                        View upcoming dental visits, reschedule slots in real-time, or cancel visits.
                      </p>
                    </div>
                    <Link
                      href="/book"
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book New</span>
                    </Link>
                  </div>

                  {/* Upcoming Visits */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Upcoming & Active Visits ({upcomingAppointments.length})
                    </h3>

                    {upcomingAppointments.length === 0 ? (
                      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
                        <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <p className="font-bold text-slate-800 text-sm">No upcoming appointments</p>
                        <p className="text-xs text-slate-400">
                          Schedule your next routine cleaning or dental check-up online.
                        </p>
                        <Link
                          href="/book"
                          className="inline-flex px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
                        >
                          Book Appointment Now
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {upcomingAppointments.map((apt: any) => (
                          <div
                            key={apt.id}
                            className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-teal-300 hover:shadow-sm transition space-y-4"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="text-[10px] font-bold font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                                  {apt.appointmentId}
                                </span>
                                <h4 className="font-bold text-slate-900 text-base mt-1.5">
                                  {apt.doctor.user.name}
                                </h4>
                                <p className="text-xs text-slate-500">{apt.doctor.specialization}</p>
                              </div>

                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                {apt.status}
                              </span>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-400 block font-medium">Date</span>
                                <span className="font-bold text-slate-900">
                                  {format(parseISO(apt.date), "EEE, MMM d, yyyy")}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-medium">Time Slot</span>
                                <span className="font-bold text-teal-700">
                                  {apt.startTime} – {apt.endTime}
                                </span>
                              </div>
                            </div>

                            {apt.treatments?.length > 0 && (
                              <div className="text-xs text-slate-600">
                                <span className="font-semibold text-slate-400">Procedures: </span>
                                {apt.treatments.map((t: any) => t.treatment.name).join(", ")}
                              </div>
                            )}

                            {/* Reschedule & Cancel Buttons */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedAppointment(apt);
                                  setCancelReason("");
                                  setCancelModalOpen(true);
                                }}
                                className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Cancel
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedAppointment(apt);
                                  setRescheduleDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
                                  setRescheduleSlot(null);
                                  setRescheduleReason("");
                                  setRescheduleModalOpen(true);
                                }}
                                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Reschedule</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Past Visits */}
                  {pastAppointments.length > 0 && (
                    <div className="pt-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        Completed & Past Visits ({pastAppointments.length})
                      </h3>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                              <tr>
                                <th className="p-3.5">ID</th>
                                <th className="p-3.5">Date & Time</th>
                                <th className="p-3.5">Specialist</th>
                                <th className="p-3.5">Procedures</th>
                                <th className="p-3.5">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {pastAppointments.map((apt: any) => (
                                <tr key={apt.id} className="hover:bg-slate-50/60">
                                  <td className="p-3.5 font-mono font-bold text-slate-900">
                                    {apt.appointmentId}
                                  </td>
                                  <td className="p-3.5">
                                    <div className="font-bold text-slate-900">
                                      {format(parseISO(apt.date), "MMM d, yyyy")}
                                    </div>
                                    <div className="text-slate-400">{apt.startTime}</div>
                                  </td>
                                  <td className="p-3.5 font-medium">{apt.doctor.user.name}</td>
                                  <td className="p-3.5 text-slate-600">
                                    {apt.treatments?.map((t: any) => t.treatment.name).join(", ") || "General Consultation"}
                                  </td>
                                  <td className="p-3.5">
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                        apt.status === "COMPLETED"
                                          ? "bg-slate-100 text-slate-700"
                                          : "bg-red-50 text-red-700"
                                      )}
                                    >
                                      {apt.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INVOICES & ONLINE BILL PAY */}
              {activeTab === "invoices" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Billing & Invoices</h2>
                      <p className="text-xs text-slate-500">
                        View itemized tax invoices, pay securely online, and download receipts.
                      </p>
                    </div>
                  </div>

                  {invoices.length === 0 ? (
                    <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
                      <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-800 text-sm">No invoices on file</p>
                      <p className="text-xs text-slate-400">All treatment bills are fully settled.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {invoices.map((inv: any) => (
                        <div
                          key={inv.id}
                          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 text-base">
                                  {inv.invoiceNumber}
                                </span>
                                <span
                                  className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                                    inv.status === "PAID"
                                      ? "bg-teal-50 text-teal-800 border-teal-200"
                                      : inv.status === "PARTIALLY_PAID"
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-red-50 text-red-800 border-red-200"
                                  )}
                                >
                                  {inv.status.replace("_", " ")}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400 mt-0.5 block">
                                Issued: {format(parseISO(inv.invoiceDate), "MMMM d, yyyy")} • Due:{" "}
                                {format(parseISO(inv.dueDate), "MMM d, yyyy")}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {inv.balanceDue > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setPayAmount(inv.balanceDue);
                                    setPaymentModalOpen(true);
                                  }}
                                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Pay Online (₹{inv.balanceDue})</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setReceiptModalOpen(true);
                                }}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1 cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Receipt</span>
                              </button>
                            </div>
                          </div>

                          {/* Line Items */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                                <tr>
                                  <th className="p-2.5">Procedure / Service</th>
                                  <th className="p-2.5 text-center">Qty</th>
                                  <th className="p-2.5 text-right">Unit Price</th>
                                  <th className="p-2.5 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {inv.items?.map((it: any, idx: number) => (
                                  <tr key={idx}>
                                    <td className="p-2.5 font-medium text-slate-900">{it.description}</td>
                                    <td className="p-2.5 text-center text-slate-600">{it.quantity}</td>
                                    <td className="p-2.5 text-right text-slate-600">
                                      {formatCurrency(it.unitPrice)}
                                    </td>
                                    <td className="p-2.5 text-right font-bold text-slate-900">
                                      {formatCurrency(it.amount || it.quantity * it.unitPrice)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Summary */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-50 rounded-xl gap-2 text-xs">
                            <div className="space-y-0.5 text-slate-500">
                              <div>
                                Subtotal: <strong>{formatCurrency(inv.subtotal)}</strong>
                              </div>
                              <div>
                                GST (18%): <strong>{formatCurrency(inv.taxAmount)}</strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div>
                                <span className="text-slate-400 block">Total:</span>
                                <span className="font-bold text-slate-900 text-sm font-mono">
                                  {formatCurrency(inv.total)}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Paid:</span>
                                <span className="font-bold text-teal-700 text-sm font-mono">
                                  {formatCurrency(inv.amountPaid)}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Balance:</span>
                                <span
                                  className={cn(
                                    "font-black text-sm font-mono",
                                    inv.balanceDue > 0 ? "text-red-600" : "text-teal-700"
                                  )}
                                >
                                  {formatCurrency(inv.balanceDue)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PRESCRIPTIONS */}
              {activeTab === "prescriptions" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Doctor Prescriptions</h2>
                    <p className="text-xs text-slate-500">
                      Prescribed medications, dosage instructions, and dental care guidelines.
                    </p>
                  </div>

                  {prescriptions.length === 0 ? (
                    <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
                      <Pill className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-800 text-sm">No prescriptions found</p>
                      <p className="text-xs text-slate-400">
                        Prescriptions written by your doctor will be listed here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {prescriptions.map((p: any) => (
                        <div
                          key={p.id}
                          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4"
                        >
                          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                                  {p.prescriptionId}
                                </span>
                                <span className="font-bold text-slate-900 text-sm">
                                  Prescribed by {p.doctor.user.name}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400 mt-0.5 block">
                                Date: {format(parseISO(p.date), "MMMM d, yyyy")}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {p.items?.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900 text-sm">{item.medication}</span>
                                  <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold">
                                    {item.dosage}
                                  </span>
                                </div>
                                <div className="text-slate-600 font-medium">
                                  Frequency: <strong>{item.frequency}</strong> • Duration:{" "}
                                  <strong>{item.duration}</strong>
                                </div>
                                {item.instructions && (
                                  <div className="text-slate-500 italic pt-1">
                                    &ldquo;{item.instructions}&rdquo;
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: TREATMENT PLANS */}
              {activeTab === "treatment-plans" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Treatment Roadmap</h2>
                    <p className="text-xs text-slate-500">
                      Planned dental procedures proposed by your specialist.
                    </p>
                  </div>

                  {treatmentPlans.length === 0 ? (
                    <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
                      <Stethoscope className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-800 text-sm">No ongoing treatment plans</p>
                      <p className="text-xs text-slate-400">
                        Multi-session treatment roadmaps will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {treatmentPlans.map((plan: any) => (
                        <div
                          key={plan.id}
                          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-base font-mono">
                                  {plan.planId}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                  {plan.status}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500">
                                Doctor: {plan.doctor.user.name} • Diagnosis: {plan.diagnosis || "General Plan"}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-xs text-slate-400 block font-medium">Estimated Cost</span>
                              <span className="font-bold text-slate-900 text-sm font-mono">
                                {formatCurrency(plan.estimatedCost)}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2 text-xs">
                            {plan.items?.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-3 bg-slate-50 rounded-xl flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-bold text-slate-900">{item.treatment.name}</div>
                                  <div className="text-slate-500">
                                    Tooth: {item.toothNumbers || "General"} • Sessions: {item.sessions}
                                  </div>
                                </div>
                                <span className="font-bold text-slate-900 font-mono">
                                  {formatCurrency(item.estimatedCost)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: MEDICAL RECORDS & FILE UPLOADS */}
              {activeTab === "documents" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-teal-700" />
                        <span>My Medical Records & Previous Files</span>
                      </h2>
                      <p className="text-xs text-slate-500">
                        Upload your previous dental history, X-Rays, and prescriptions. All uploaded files are instantly accessible to doctors and clinic specialists.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold rounded-full">
                        {documents.length} File{documents.length === 1 ? "" : "s"} Stored
                      </span>
                    </div>
                  </div>

                  {/* UPLOAD FORM CARD */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <FileUp className="w-5 h-5 text-teal-700" />
                      <h3 className="text-sm font-bold text-slate-900">Upload New File or Previous Record</h3>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        uploadDocMutation.mutate();
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Document Name / Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Previous OPG X-Ray 2024 or Blood Test Report"
                            value={docName}
                            onChange={(e) => setDocName(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Document Category
                          </label>
                          <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                          >
                            <option value="PREVIOUS_RECORD">Previous Dental / Medical Record</option>
                            <option value="X_RAY">Dental X-Ray / Radiograph / Scan</option>
                            <option value="PRESCRIPTION">Past Prescription</option>
                            <option value="LAB_REPORT">Lab / Blood Test Report</option>
                            <option value="INSURANCE">Dental Insurance / ID Card</option>
                            <option value="OTHER">Other Clinical File</option>
                          </select>
                        </div>
                      </div>

                      {/* File Selection Box */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Select File (PDF, PNG, JPG, JPEG, WEBP up to 15MB) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-2xl p-4 sm:p-6 bg-slate-50/70 text-center transition flex flex-col items-center justify-center cursor-pointer">
                          <input
                            type="file"
                            required
                            accept=".pdf,image/*,.doc,.docx"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                const selected = e.target.files[0];
                                setDocFile(selected);
                                if (!docName.trim()) {
                                  setDocName(selected.name.replace(/\.[^/.]+$/, ""));
                                }
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Upload className="w-8 h-8 text-teal-700 mb-2" />
                          {docFile ? (
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-900">{docFile.name}</p>
                              <p className="text-[11px] text-teal-700 font-medium">
                                {(docFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for upload
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-800">
                                Click or drag & drop files here
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Supports Dental X-Rays, PDFs, Medical Scans, and Images
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
                          <span>Synced securely across all doctor workstations and clinic dashboards.</span>
                        </div>

                        <button
                          type="submit"
                          disabled={!docFile || isUploadingDoc || uploadDocMutation.isPending}
                          className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                        >
                          {isUploadingDoc ? (
                            <span>Uploading File...</span>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload to My Records</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* DOCUMENT LIST */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">Your Uploaded Files & Scans</h3>

                    {documents.length === 0 ? (
                      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-bold text-slate-800 text-sm">No files uploaded yet</p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Upload previous dental history, scans, or prescriptions above so your dentist can review them prior to your procedure.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {documents.map((doc: any) => {
                          const isImage = doc.mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.url);
                          const formattedSize = doc.size ? (doc.size / (1024 * 1024)).toFixed(2) + " MB" : "Document";
                          const formattedType = doc.type?.replace(/_/g, " ");

                          return (
                            <div
                              key={doc.id}
                              className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-teal-300 shadow-xs flex flex-col justify-between space-y-3 transition"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                                  {isImage ? (
                                    <ImageIcon className="w-5 h-5" />
                                  ) : (
                                    <FileText className="w-5 h-5" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 text-xs truncate block">
                                      {doc.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                    <span className="px-2 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                      {formattedType}
                                    </span>
                                    <span>• {formattedSize}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-1">
                                    Uploaded on {format(parseISO(doc.uploadedAt), "MMM d, yyyy, h:mm a")}
                                    {doc.uploadedBy && ` • By ${doc.uploadedBy}`}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      if (isImage) {
                                        setPreviewDocModal(doc);
                                      } else {
                                        window.open(doc.url, "_blank");
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Preview</span>
                                  </button>

                                  <a
                                    href={doc.url}
                                    download={doc.name}
                                    className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                  </a>
                                </div>

                                <button
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this file?")) {
                                      deleteDocMutation.mutate(doc.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                  title="Delete Document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: FEEDBACK & REVIEWS */}
              {activeTab === "feedback" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <span>Feedback & Patient Experience</span>
                      </h2>
                      <p className="text-xs text-slate-500">
                        Share your treatment experience with our doctors and team. Your review updates our clinic portal and public testimonials!
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold rounded-full flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                        <span>{feedbacks.length} Feedback Submitted</span>
                      </span>
                    </div>
                  </div>

                  {/* FEEDBACK SUBMISSION FORM */}
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-base font-bold text-slate-900">
                        How was your dental consultation & treatment?
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Please rate your overall satisfaction and let us know your thoughts.
                      </p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitFeedbackMutation.mutate();
                      }}
                      className="space-y-5"
                    >
                      {/* Interactive Star Rating */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Overall Rating <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isFilled = (feedbackHoverRating || feedbackRating) >= star;
                              return (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setFeedbackRating(star)}
                                  onMouseEnter={() => setFeedbackHoverRating(star)}
                                  onMouseLeave={() => setFeedbackHoverRating(0)}
                                  className="p-1 rounded-lg hover:scale-125 transition-transform duration-150 cursor-pointer focus:outline-none"
                                >
                                  <Star
                                    className={cn(
                                      "w-8 h-8 transition-colors",
                                      isFilled
                                        ? "text-amber-500 fill-amber-500 drop-shadow-xs"
                                        : "text-slate-300"
                                    )}
                                  />
                                </button>
                              );
                            })}
                          </div>

                          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full ml-2">
                            {feedbackRating === 5 && "★★★★★ 5.0 - Exceptional & Pain-Free!"}
                            {feedbackRating === 4 && "★★★★☆ 4.0 - Very Good Experience"}
                            {feedbackRating === 3 && "★★★☆☆ 3.0 - Satisfactory Care"}
                            {feedbackRating === 2 && "★★☆☆☆ 2.0 - Needs Improvement"}
                            {feedbackRating === 1 && "★☆☆☆☆ 1.0 - Unsatisfactory"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Category */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Feedback Category
                          </label>
                          <select
                            value={feedbackCategory}
                            onChange={(e) => setFeedbackCategory(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                          >
                            <option value="GENERAL">General Clinic Experience</option>
                            <option value="DOCTOR">Doctor & Specialist Care</option>
                            <option value="TREATMENT">Treatment Quality & Painlessness</option>
                            <option value="CLEANLINESS">Hygiene & Class-B Sterilization</option>
                            <option value="STAFF">Front Desk & Staff Hospitality</option>
                          </select>
                        </div>

                        {/* Treatment */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Treatment Received (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Teeth Cleaning, Root Canal, Aligners"
                            value={feedbackTreatment}
                            onChange={(e) => setFeedbackTreatment(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                        </div>

                        {/* Doctor */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Dentist / Specialist (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Dr. Ananya Rao"
                            value={feedbackDoctor}
                            onChange={(e) => setFeedbackDoctor(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Comment */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Your Review & Comments <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Tell us about your experience, the doctor's explanation, cleanliness, pain relief, or comfort during your visit..."
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                          <span>Your review will appear with your first name as a verified patient.</span>
                        </div>

                        <button
                          type="submit"
                          disabled={
                            isSubmittingFeedback ||
                            submitFeedbackMutation.isPending ||
                            !feedbackComment.trim()
                          }
                          className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-teal-700 to-sky-700 hover:from-teal-800 hover:to-sky-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-700/20 transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isSubmittingFeedback ? (
                            <span>Submitting Review...</span>
                          ) : (
                            <>
                              <Star className="w-4 h-4 fill-white" />
                              <span>Submit Patient Feedback</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* FEEDBACK HISTORY LIST */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">Your Previous Reviews & Feedback</h3>

                    {feedbacks.length === 0 ? (
                      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
                        <MessageSquareHeart className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-bold text-slate-800 text-sm">No feedback submitted yet</p>
                        <p className="text-xs text-slate-400">
                          Your submitted feedback will appear here and help other patients!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {feedbacks.map((fb: any) => (
                          <div
                            key={fb.id}
                            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star
                                        key={s}
                                        className={cn(
                                          "w-4 h-4",
                                          s <= fb.rating
                                            ? "text-amber-500 fill-amber-500"
                                            : "text-slate-200"
                                        )}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs font-bold text-slate-800">
                                    {fb.rating}.0 / 5.0
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                    {fb.category?.replace(/_/g, " ")}
                                  </span>
                                </div>

                                {fb.treatment && (
                                  <div className="text-xs text-teal-700 font-semibold">
                                    Treatment: {fb.treatment}
                                  </div>
                                )}
                              </div>

                              <div className="text-right">
                                <span className="text-[11px] text-slate-400">
                                  {format(parseISO(fb.createdAt), "MMM d, yyyy")}
                                </span>
                                {fb.isPublic && (
                                  <span className="block text-[10px] text-emerald-600 font-semibold">
                                    ✓ Live on Clinic Page
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                              &ldquo;{fb.comment}&rdquo;
                            </p>

                            {fb.doctorName && (
                              <div className="text-[11px] text-slate-500">
                                Attending Specialist: <span className="font-semibold text-slate-800">{fb.doctorName}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: RESCHEDULE */}
      {rescheduleModalOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-slate-900">Reschedule Appointment</h3>
              </div>
              <button
                onClick={() => setRescheduleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-teal-50/70 border border-teal-100 rounded-2xl text-xs space-y-1 text-teal-950">
              <div>
                Doctor: <strong>{selectedAppointment.doctor.user.name}</strong>
              </div>
              <div>
                Current Slot: {format(parseISO(selectedAppointment.date), "MMM d, yyyy")} at{" "}
                {selectedAppointment.startTime}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Choose New Date
                </label>
                <input
                  type="date"
                  min={format(new Date(), "yyyy-MM-dd")}
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleSlot(null);
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Select New Available Slot
                </label>
                {rescheduleSlotsLoading ? (
                  <div className="py-6 text-center text-slate-400 text-xs">Checking availability...</div>
                ) : rescheduleSlots.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                    No open slots on this date.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {rescheduleSlots.map((slot: any, idx: number) => {
                      const isSelected = rescheduleSlot?.startTime === slot.time;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => {
                            setRescheduleSlot({ startTime: slot.time, endTime: slot.endTime });
                          }}
                          className={cn(
                            "py-2 px-1 rounded-xl text-xs font-bold transition text-center",
                            isSelected
                              ? "bg-teal-700 text-white shadow-xs"
                              : slot.available
                              ? "bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100 cursor-pointer"
                              : "bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed line-through"
                          )}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Rescheduling (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule adjustment..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={rescheduleMutation.isPending || !rescheduleSlot}
                onClick={() => rescheduleMutation.mutate()}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {rescheduleMutation.isPending ? "Updating..." : "Confirm New Slot"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CANCEL */}
      {cancelModalOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-900">Cancel Appointment?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel your appointment ({selectedAppointment.appointmentId}) on{" "}
              <strong>{format(parseISO(selectedAppointment.date), "MMM d, yyyy")}</strong> with{" "}
              <strong>{selectedAppointment.doctor.user.name}</strong>?
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for cancellation (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Let us know why you are cancelling..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Keep Appointment
              </button>

              <button
                type="button"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel Visit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SECURE ONLINE PAYMENT */}
      {paymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-slate-900">Secure Online Bill Payment</h3>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block">Invoice:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {selectedInvoice.invoiceNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Balance Due:</span>
                <span className="font-black text-rose-600 text-sm font-mono">
                  {formatCurrency(selectedInvoice.balanceDue)}
                </span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                payMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoice.balanceDue}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-base font-black text-teal-700 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "UPI", label: "UPI (GPay/PhonePe)", icon: QrCode },
                    { id: "CARD", label: "Debit/Credit Card", icon: CreditCard },
                    { id: "BANK_TRANSFER", label: "NetBanking", icon: DollarSign },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id)}
                        className={cn(
                          "py-2.5 px-2 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 cursor-pointer",
                          payMethod === m.id
                            ? "border-teal-600 bg-teal-50 text-teal-900 shadow-xs"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {payMethod === "UPI" && (
                <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-teal-900">Enter UPI ID / VPA</span>
                    <span className="text-[10px] text-teal-700 font-bold">Secure Gateway</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourname@oksbi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-teal-200 rounded-lg text-xs font-mono"
                  />
                </div>
              )}

              {payMethod === "CARD" && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <span className="font-semibold text-slate-700 block">Card Details</span>
                  <input
                    type="text"
                    required
                    placeholder="Card Number (16 digits)"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isProcessingPayment || payMutation.isPending}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-md shadow-teal-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessingPayment ? (
                    <span>Processing Secure Payment...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Pay ₹{payAmount} Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PRINTABLE TAX RECEIPT */}
      {receiptModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0">
                  <img src="/images/logo.png" alt="DentiFlow" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Denti<span className="text-teal-700">Flow</span> Clinic
                  </h2>
                  <p className="text-[11px] text-slate-500">12, Rajpath Avenue, Bengaluru</p>
                  <p className="text-[10px] text-slate-400">GSTIN: 29ABCDE1234F1ZX | Phone: 080-46001234</p>
                </div>
              </div>

              <div className="text-right">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-bold rounded">
                  TAX INVOICE
                </span>
                <div className="text-xs font-mono font-bold text-slate-900 mt-1">
                  {selectedInvoice.invoiceNumber}
                </div>
                <div className="text-[10px] text-slate-400">
                  {format(parseISO(selectedInvoice.invoiceDate), "MMM d, yyyy")}
                </div>
              </div>
            </div>

            {/* Billed To */}
            <div className="p-3.5 bg-slate-50 rounded-xl grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold text-[10px]">PATIENT DETAILS</span>
                <div className="font-bold text-slate-900">
                  {patient.firstName} {patient.lastName}
                </div>
                <div className="text-slate-500">{patient.patientId} • {patient.phone}</div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-semibold text-[10px]">PAYMENT STATUS</span>
                <span className="font-bold text-teal-700">{selectedInvoice.status.replace("_", " ")}</span>
                <div className="text-slate-500">Total Paid: {formatCurrency(selectedInvoice.amountPaid)}</div>
              </div>
            </div>

            {/* Line items */}
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Procedure</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Price</th>
                  <th className="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedInvoice.items?.map((it: any, idx: number) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-medium">{it.description}</td>
                    <td className="p-2.5 text-center">{it.quantity}</td>
                    <td className="p-2.5 text-right">{formatCurrency(it.unitPrice)}</td>
                    <td className="p-2.5 text-right font-bold">{formatCurrency(it.amount || it.quantity * it.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end text-xs space-y-1 text-right">
              <div className="w-48 space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax GST (18%):</span>
                  <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200 text-sm font-mono">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(selectedInvoice.total)}</span>
                </div>
                <div className="flex justify-between text-teal-700 font-bold font-mono">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(selectedInvoice.amountPaid)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DOCUMENT PREVIEW MODAL */}
      {previewDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{previewDocModal.name}</h3>
                <p className="text-xs text-slate-400">
                  {previewDocModal.type?.replace(/_/g, " ")} • Uploaded {format(parseISO(previewDocModal.uploadedAt), "MMM d, yyyy")}
                </p>
              </div>
              <button
                onClick={() => setPreviewDocModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl bg-slate-950 flex items-center justify-center p-2 min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewDocModal.url}
                alt={previewDocModal.name}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={previewDocModal.url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Fullscreen Tab</span>
              </a>

              <button
                onClick={() => setPreviewDocModal(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      <ClientFooter />
    </div>
  );
}

