"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays, isBefore, startOfToday } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Phone,
  Mail,
  Stethoscope,
  ShieldCheck,
  Receipt,
  Printer,
  Download,
  QrCode,
  CreditCard,
  Building2,
  Check,
  Heart,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import ClientNavbar from "@/components/client/ClientNavbar";
import ClientFooter from "@/components/client/ClientFooter";
import { formatCurrency, cn } from "@/lib/utils";
import Link from "next/link";

export default function BookAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-500 text-sm font-medium">
          Loading booking experience...
        </div>
      }
    >
      <BookAppointmentContent />
    </Suspense>
  );
}

const COMMON_CONCERNS = [
  { id: "pain", label: "Toothache / Sharp Pain", icon: "⚡", recommendedCategory: "Restorative" },
  { id: "cleaning", label: "Teeth Cleaning & Stain Removal", icon: "✨", recommendedCategory: "Preventive" },
  { id: "aligners", label: "Crooked Teeth / Clear Aligners", icon: "📐", recommendedCategory: "Orthodontic" },
  { id: "whitening", label: "Teeth Whitening & Brightening", icon: "💎", recommendedCategory: "Cosmetic" },
  { id: "checkup", label: "Routine Dental Checkup", icon: "🩺", recommendedCategory: "Consultation" },
  { id: "bleeding", label: "Bleeding Gums / Sensitivity", icon: "🩸", recommendedCategory: "Preventive" },
  { id: "wisdom", label: "Wisdom Tooth / Extraction", icon: "🦷", recommendedCategory: "Surgical" },
  { id: "implant", label: "Missing Tooth / Dental Implant", icon: "🔩", recommendedCategory: "Surgical" },
];

function BookAppointmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Wizard Steps: 1 (Concern & Procedure) -> 2 (Doctor) -> 3 (Date & Slot) -> 4 (Patient Details) -> 5 (Fee Review & Payment) -> 6 (Bill & Confirmation)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Dental Concern & Symptoms
  const [selectedConcern, setSelectedConcern] = useState<string>("checkup");
  const [symptomsDescription, setSymptomsDescription] = useState<string>("");

  // Selected Service
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>(
    searchParams.get("treatmentId") || ""
  );

  // Doctor & Slot
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    searchParams.get("doctorId") || ""
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    format(addDays(new Date(), 1), "yyyy-MM-dd")
  );
  const [selectedSlot, setSelectedSlot] = useState<{
    startTime: string;
    endTime: string;
    availableDoctorIds: string[];
  } | null>(null);

  // Patient info
  const [patientForm, setPatientForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    dateOfBirth: "1995-01-01",
    gender: "FEMALE",
    notes: "",
    allergies: "",
    medicalConditions: "",
  });

  // Payment Selection
  const [paymentOption, setPaymentOption] = useState<"UPI" | "CARD" | "CLINIC">("UPI");
  const [upiIdInput, setUpiIdInput] = useState("");
  const [cardNumberInput, setCardNumberInput] = useState("");
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  // Final Success Data
  const [bookingResult, setBookingResult] = useState<any>(null);

  // 1. Fetch treatments
  const { data: treatmentsData, isLoading: treatmentsLoading } = useQuery({
    queryKey: ["public-treatments"],
    queryFn: async () => {
      const res = await fetch("/api/public/treatments");
      if (!res.ok) return { categories: [], treatments: [] };
      return res.json();
    },
  });

  // 2. Fetch doctors
  const { data: doctorsData, isLoading: doctorsLoading } = useQuery({
    queryKey: ["public-doctors"],
    queryFn: async () => {
      const res = await fetch("/api/public/doctors");
      if (!res.ok) return { data: [] };
      return res.json();
    },
  });

  const treatments = treatmentsData?.treatments || [];
  const categories = treatmentsData?.categories || [];
  const doctors = doctorsData?.data || [];

  // Default to first treatment if none selected
  useEffect(() => {
    if (treatments.length > 0 && !selectedTreatmentId) {
      const defaultTreatment = treatments.find((t: any) => t.name.toLowerCase().includes("consultation")) || treatments[0];
      if (defaultTreatment) setSelectedTreatmentId(defaultTreatment.id);
    }
  }, [treatments, selectedTreatmentId]);

  const selectedTreatment = useMemo(() => {
    return treatments.find((t: any) => t.id === selectedTreatmentId);
  }, [treatments, selectedTreatmentId]);

  const selectedDoctor = useMemo(() => {
    return doctors.find((d: any) => d.id === selectedDoctorId);
  }, [doctors, selectedDoctorId]);

  // Fee Calculation
  const consultationFee = 500;
  const procedureFee = selectedTreatment ? selectedTreatment.price : 0;
  const isConsultationOnly = selectedTreatment?.name?.toLowerCase().includes("consultation");
  const estimatedSubtotal = isConsultationOnly ? consultationFee : consultationFee + procedureFee;
  const estimatedGst = Math.round(estimatedSubtotal * 0.18);
  const estimatedTotal = estimatedSubtotal + estimatedGst;

  // 3. Fetch real-time available slots
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ["public-slots", selectedDate, selectedDoctorId, selectedTreatment?.duration],
    queryFn: async () => {
      if (!selectedDate) return { slots: [] };
      const params = new URLSearchParams();
      params.append("date", selectedDate);
      if (selectedDoctorId) params.append("doctorId", selectedDoctorId);
      if (selectedTreatment?.duration) params.append("duration", String(selectedTreatment.duration));

      const res = await fetch(`/api/public/slots?${params.toString()}`);
      if (!res.ok) return { slots: [] };
      return res.json();
    },
    enabled: Boolean(selectedDate),
  });

  const slots = slotsData?.slots || [];

  // Submit Booking Mutation
  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot) throw new Error("Please select a time slot.");

      const assignedDoctorId =
        selectedDoctorId || selectedSlot.availableDoctorIds[0] || (doctors[0]?.id as string);

      if (!assignedDoctorId) {
        throw new Error("No doctor available for the selected slot.");
      }

      const concernLabel = COMMON_CONCERNS.find((c) => c.id === selectedConcern)?.label || selectedConcern;
      const fullConcernText = [
        concernLabel,
        symptomsDescription ? `Details: ${symptomsDescription}` : "",
      ]
        .filter(Boolean)
        .join(" — ");

      const isOnlinePay = paymentOption === "UPI" || paymentOption === "CARD";

      const payload = {
        ...patientForm,
        dentalConcern: fullConcernText,
        doctorId: assignedDoctorId,
        treatmentIds: selectedTreatmentId ? [selectedTreatmentId] : [],
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        paymentMethod: paymentOption,
        isPaid: isOnlinePay,
        transactionRef: isOnlinePay ? `${paymentOption}-${Date.now().toString().slice(-6)}` : undefined,
      };

      const res = await fetch("/api/patient/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Booking failed.");
      }
      return json;
    },
    onSuccess: (data) => {
      setBookingResult(data.data);
      setCurrentStep(6);
      if (typeof window !== "undefined") {
        localStorage.setItem("patientIdentifier", patientForm.phone.trim());
      }
      toast.success("Appointment reserved and official bill generated!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <div className="print:hidden">
        <ClientNavbar />
      </div>

      <main className="flex-1 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Banner */}
          {currentStep < 6 && (
            <div className="text-center space-y-2 mb-8">
              <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider border border-teal-200">
                Online Patient Registration & Booking
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Reserve Your Dental Visit
              </h1>
              <p className="text-sm text-slate-500 max-w-lg mx-auto">
                Tell us your concern, select your preferred doctor, and receive an itemized fee breakdown with instant digital bill generation.
              </p>
            </div>
          )}

          {/* Stepper Progress Bar */}
          {currentStep < 6 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-8">
              <div className="grid grid-cols-5 gap-2 text-center">
                {[
                  { step: 1, label: "1. Concern" },
                  { step: 2, label: "2. Doctor" },
                  { step: 3, label: "3. Slot" },
                  { step: 4, label: "4. Details" },
                  { step: 5, label: "5. Fee & Pay" },
                ].map((s) => (
                  <div
                    key={s.step}
                    onClick={() => {
                      if (currentStep > s.step) setCurrentStep(s.step);
                    }}
                    className={cn(
                      "flex flex-col items-center p-2 rounded-xl transition cursor-pointer",
                      currentStep === s.step
                        ? "bg-teal-50 text-teal-800 font-bold border border-teal-200"
                        : currentStep > s.step
                        ? "text-teal-700 font-semibold"
                        : "text-slate-400 font-medium"
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1",
                        currentStep === s.step
                          ? "bg-teal-700 text-white shadow-xs"
                          : currentStep > s.step
                          ? "bg-teal-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {currentStep > s.step ? <Check className="w-4 h-4" /> : s.step}
                    </div>
                    <span className="text-[11px] sm:text-xs truncate">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1: CONCERN & TREATMENT */}
          {currentStep === 1 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Step 1 of 5</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">What is your Primary Dental Concern?</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Select the issue you are experiencing so our specialists can prepare your consultation.
                </p>
              </div>

              {/* Quick Concern Badges */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Select Your Concern
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {COMMON_CONCERNS.map((c) => {
                    const isSelected = selectedConcern === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setSelectedConcern(c.id)}
                        className={cn(
                          "p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2",
                          isSelected
                            ? "border-teal-700 bg-teal-50/70 shadow-xs ring-2 ring-teal-600/20"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        )}
                      >
                        <span className="text-xl">{c.icon}</span>
                        <span className="text-xs font-bold text-slate-800 leading-snug">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Symptoms Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Describe Your Symptoms (Optional)
                </label>
                <textarea
                  rows={3}
                  value={symptomsDescription}
                  onChange={(e) => setSymptomsDescription(e.target.value)}
                  placeholder="e.g., Mild sensitivity in upper right molar when drinking hot fluids, pain started 2 days ago..."
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Specific Procedure Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Select Relevant Dental Procedure
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Pricing will be itemized in the review step
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {treatments.map((t: any) => {
                    const isSelected = selectedTreatmentId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTreatmentId(t.id)}
                        className={cn(
                          "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                          isSelected
                            ? "border-teal-700 bg-teal-50/50 shadow-xs ring-2 ring-teal-600/20"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{t.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {t.duration} mins duration
                          </span>
                        </div>
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold",
                            isSelected
                              ? "bg-teal-700 border-teal-700 text-white"
                              : "border-slate-300 text-transparent"
                          )}
                        >
                          ✓
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedTreatmentId) {
                      return toast.error("Please select a service or procedure.");
                    }
                    setCurrentStep(2);
                  }}
                  className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Doctor Selection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE DOCTOR */}
          {currentStep === 2 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Step 2 of 5</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Select Your Specialist Doctor</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Choose a verified dental surgeon or specialist for your consultation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Any Doctor Option */}
                <div
                  onClick={() => setSelectedDoctorId("")}
                  className={cn(
                    "p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-center group",
                    selectedDoctorId === ""
                      ? "border-teal-700 bg-teal-50/50 shadow-sm ring-2 ring-teal-600/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mx-auto border border-teal-200">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Any Available Doctor</h3>
                      <p className="text-xs text-teal-700 font-semibold mt-0.5">Fastest Booking</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Automatically pair with the earliest available senior dentist.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Specific Doctors */}
                {doctors.map((doc: any) => {
                  const isSelected = selectedDoctorId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctorId(doc.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-center group",
                        isSelected
                          ? "border-teal-700 bg-teal-50/50 shadow-sm ring-2 ring-teal-600/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto shadow-xs border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={doc.avatar || "/images/doctor_ananya.jpg"}
                            alt={doc.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{doc.name}</h3>
                          <p className="text-xs font-bold text-teal-700">{doc.qualification}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{doc.specialization}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Date & Slot</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DATE & TIME SLOTS */}
          {currentStep === 3 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Step 3 of 5</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Select Consultation Date & Time</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Pick a convenient appointment slot. Real-time availability is updated every 30 seconds.
                </p>
              </div>

              {/* Quick Date Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Select Date
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const d = addDays(new Date(), i + 1);
                    const dateStr = format(d, "yyyy-MM-dd");
                    const isSelected = selectedDate === dateStr;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setSelectedSlot(null);
                        }}
                        className={cn(
                          "p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center",
                          isSelected
                            ? "bg-teal-700 border-teal-700 text-white shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                        )}
                      >
                        <span className="text-[11px] font-semibold uppercase">{format(d, "EEE")}</span>
                        <span className="text-lg font-black">{format(d, "dd")}</span>
                        <span className="text-[10px] opacity-80">{format(d, "MMM")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Available Slots for {format(new Date(selectedDate), "EEEE, dd MMMM yyyy")}
                </label>

                {slotsLoading ? (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    Checking doctor calendar slots...
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-8 text-center bg-amber-50/50 rounded-2xl border border-amber-200 space-y-2">
                    <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
                    <p className="text-sm font-bold text-amber-900">
                      No slots available on this date.
                    </p>
                    <p className="text-xs text-amber-700">
                      Please pick another day or select &quot;Any Available Doctor&quot;.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {slots.map((slot: any) => {
                      const isSelected =
                        selectedSlot?.startTime === slot.startTime &&
                        selectedSlot?.endTime === slot.endTime;

                      return (
                        <button
                          key={`${slot.startTime}-${slot.endTime}`}
                          type="button"
                          disabled={!slot.isAvailable}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "p-3 rounded-xl border text-center transition flex items-center justify-between",
                            !slot.isAvailable
                              ? "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed line-through"
                              : isSelected
                              ? "bg-teal-700 border-teal-700 text-white shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 cursor-pointer"
                          )}
                        >
                          <span className="text-xs font-bold">
                            {slot.startTime} – {slot.endTime}
                          </span>
                          <Clock className={cn("w-3.5 h-3.5", isSelected ? "text-white" : "text-slate-400")} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedSlot) {
                      return toast.error("Please select an appointment time slot.");
                    }
                    setCurrentStep(4);
                  }}
                  className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Patient Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PATIENT DETAILS */}
          {currentStep === 4 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Step 4 of 5</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Patient Personal Information</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Your phone number will be used for your Patient Portal access and official GST invoices.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav"
                    value={patientForm.firstName}
                    onChange={(e) => setPatientForm({ ...patientForm, firstName: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sharma"
                    value={patientForm.lastName}
                    onChange={(e) => setPatientForm({ ...patientForm, lastName: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Phone Number (Login ID) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9811111111"
                      value={patientForm.phone}
                      onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Email Address (For Invoices)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="e.g. aarav@email.com"
                      value={patientForm.email}
                      onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={patientForm.dateOfBirth}
                    onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Gender
                  </label>
                  <select
                    value={patientForm.gender}
                    onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
                  >
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!patientForm.firstName.trim() || !patientForm.lastName.trim() || !patientForm.phone.trim()) {
                      return toast.error("Please fill in your name and phone number.");
                    }
                    setCurrentStep(5);
                  }}
                  className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Review Fees & Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: FEE ESTIMATE & PAYMENT SUPPORT */}
          {currentStep === 5 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Step 5 of 5</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Fee Breakdown & Payment Selection</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Here is the transparent estimate based on your concern ({COMMON_CONCERNS.find((c) => c.id === selectedConcern)?.label}).
                </p>
              </div>

              {/* Itemized Fee Breakdown Card */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-teal-700" />
                  <span>Itemized Fee Estimate</span>
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-700">
                    <span>Specialist Consultation & Examination</span>
                    <span className="font-mono font-semibold">{formatCurrency(consultationFee)}</span>
                  </div>

                  {!isConsultationOnly && selectedTreatment && (
                    <div className="flex justify-between text-slate-700">
                      <span>{selectedTreatment.name} (Estimated Base)</span>
                      <span className="font-mono font-semibold">{formatCurrency(selectedTreatment.price)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-500 text-xs pt-2 border-t border-slate-200">
                    <span>Applicable GST (18%)</span>
                    <span className="font-mono font-semibold">{formatCurrency(estimatedGst)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-900 text-base font-black pt-2 border-t border-slate-300">
                    <span>Total Estimated Fee</span>
                    <span className="font-mono text-xl text-teal-800">{formatCurrency(estimatedTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Choose Payment Mode
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentOption("UPI")}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2",
                      paymentOption === "UPI"
                        ? "border-teal-700 bg-teal-50/70 shadow-xs ring-2 ring-teal-600/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <QrCode className="w-5 h-5 text-teal-700" />
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                        INSTANT
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">UPI QR Scan</span>
                      <span className="text-[11px] text-slate-500">GPay, PhonePe, Paytm, BHIM</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentOption("CARD")}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2",
                      paymentOption === "CARD"
                        ? "border-teal-700 bg-teal-50/70 shadow-xs ring-2 ring-teal-600/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <CreditCard className="w-5 h-5 text-teal-700" />
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                        ONLINE
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Credit / Debit Card</span>
                      <span className="text-[11px] text-slate-500">Visa, Mastercard, RuPay</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentOption("CLINIC")}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2",
                      paymentOption === "CLINIC"
                        ? "border-teal-700 bg-teal-50/70 shadow-xs ring-2 ring-teal-600/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Building2 className="w-5 h-5 text-teal-700" />
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        FLEXIBLE
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Pay at Clinic</span>
                      <span className="text-[11px] text-slate-500">Pay on arrival via Cash / POS</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* UPI QR Display */}
              {paymentOption === "UPI" && (
                <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-md animate-in fade-in duration-200">
                  <div className="bg-white p-3 rounded-2xl shrink-0 shadow-inner flex flex-col items-center">
                    {/* Dynamic QR Display */}
                    <div className="w-36 h-36 border-2 border-slate-900 rounded-xl flex items-center justify-center p-2 bg-white relative">
                      <div className="text-center">
                        <QrCode className="w-24 h-24 text-slate-900 mx-auto" />
                        <span className="text-[10px] font-bold text-teal-800 font-mono block mt-1">
                          UPI: dentiflow@upi
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 mt-1 uppercase">
                      Scan to Pay {formatCurrency(estimatedTotal)}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 text-center sm:text-left">
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                      Instant UPI Payment
                    </span>
                    <h4 className="text-base font-bold text-white">
                      Scan with any UPI App (GPay, PhonePe, Paytm)
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Scan the QR code above or enter your UPI ID below. A verified tax invoice will be generated instantly.
                    </p>
                    <div className="flex items-center gap-2 max-w-xs mx-auto sm:mx-0">
                      <input
                        type="text"
                        placeholder="yourname@upi (optional)"
                        value={upiIdInput}
                        onChange={(e) => setUpiIdInput(e.target.value)}
                        className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-teal-400 w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CARD Payment Fields */}
              {paymentOption === "CARD" && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-200">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">Enter Card Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="16-Digit Card Number (e.g. 4111 2222 3333 4444)"
                        value={cardNumberInput}
                        onChange={(e) => setCardNumberInput(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="MM / YY"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={bookMutation.isPending}
                  onClick={() => bookMutation.mutate()}
                  className="px-7 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  {bookMutation.isPending ? (
                    <span>Generating Bill & Confirming...</span>
                  ) : (
                    <>
                      <span>
                        {paymentOption === "CLINIC"
                          ? "Confirm & Generate Bill"
                          : `Pay ${formatCurrency(estimatedTotal)} & Generate Bill`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: CONFIRMATION & OFFICIAL PRINTABLE / DOWNLOADABLE BILL */}
          {currentStep === 6 && bookingResult && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Top Banner (Hidden in Print) */}
              <div className="print:hidden bg-teal-800 text-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0 border border-white/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-200">
                      Booking Confirmed & Tax Invoice Generated
                    </span>
                    <h2 className="text-2xl font-black text-white">Your Visit is Reserved!</h2>
                    <p className="text-xs text-teal-100 mt-1">
                      A copy of your official bill has been saved to your Patient Portal.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2.5 bg-white text-teal-900 rounded-xl font-bold text-xs shadow-xs hover:bg-teal-50 transition flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Download / Print Bill</span>
                  </button>

                  <Link
                    href={`/portal?phone=${encodeURIComponent(bookingResult.patient.phone)}`}
                    className="px-4 py-2.5 bg-teal-900/60 hover:bg-teal-900 text-white rounded-xl font-bold text-xs border border-white/20 transition flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    <span>Go to My Portal</span>
                  </Link>
                </div>
              </div>

              {/* OFFICIAL TAX INVOICE & APPOINTMENT VOUCHER (PRINTABLE) */}
              <div
                id="printable-bill"
                className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0"
              >
                {/* Invoice Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-slate-200 pb-6">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/images/logo.png" alt="DentiFlow" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        Denti<span className="text-teal-700">Flow</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">Multispeciality Dental Clinic & Implant Center</p>
                      <p className="text-[11px] text-slate-400">GSTIN: {bookingResult.clinic?.gstin || "29ABCDE1234F1ZX"}</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200/60">
                      Official Tax Invoice & Voucher
                    </span>
                    <h4 className="text-lg font-black text-slate-900 font-mono mt-1">
                      {bookingResult.invoice?.invoiceNumber || "INV-2026-0001"}
                    </h4>
                    <span className="text-xs text-slate-500 block">
                      Date: {format(new Date(bookingResult.date), "dd MMM yyyy")}
                    </span>
                  </div>
                </div>

                {/* Patient & Doctor Meta Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-slate-700 uppercase block mb-1">Patient Details</span>
                    <p className="font-bold text-slate-900 text-sm">
                      {bookingResult.patient?.firstName} {bookingResult.patient?.lastName}
                    </p>
                    <p className="text-slate-600">Patient ID: <span className="font-mono font-semibold">{bookingResult.patient?.patientId}</span></p>
                    <p className="text-slate-600">Phone: {bookingResult.patient?.phone}</p>
                    {bookingResult.patient?.email && <p className="text-slate-600">Email: {bookingResult.patient?.email}</p>}
                  </div>

                  <div className="space-y-1 text-xs sm:text-right">
                    <span className="font-bold text-slate-700 uppercase block mb-1">Appointment Schedule</span>
                    <p className="font-bold text-teal-800 text-sm">{bookingResult.doctor?.name}</p>
                    <p className="text-slate-600">{bookingResult.doctor?.specialization}</p>
                    <p className="font-semibold text-slate-900">
                      {format(new Date(bookingResult.date), "EEEE, dd MMMM yyyy")}
                    </p>
                    <p className="text-teal-700 font-bold">
                      Slot: {bookingResult.startTime} – {bookingResult.endTime}
                    </p>
                  </div>
                </div>

                {/* Stated Concern Notice */}
                {bookingResult.dentalConcern && (
                  <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-100 text-xs text-slate-700">
                    <span className="font-bold text-teal-900 uppercase block mb-0.5">Recorded Dental Concern:</span>
                    <p>{bookingResult.dentalConcern}</p>
                  </div>
                )}

                {/* Itemized Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Itemized Fee Summary</h4>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                        <th className="py-2.5">Service / Procedure</th>
                        <th className="py-2.5 text-center">Qty</th>
                        <th className="py-2.5 text-right">Tax (18%)</th>
                        <th className="py-2.5 text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bookingResult.invoice?.items?.map((item: any) => (
                        <tr key={item.id || item.description}>
                          <td className="py-3 font-semibold text-slate-800">{item.description}</td>
                          <td className="py-3 text-center">{item.quantity}</td>
                          <td className="py-3 text-right font-mono text-slate-500">{formatCurrency(item.tax)}</td>
                          <td className="py-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(item.unitPrice)}
                          </td>
                        </tr>
                      )) || (
                        <tr>
                          <td className="py-3 font-semibold text-slate-800">Doctor Consultation & Clinical Checkup</td>
                          <td className="py-3 text-center">1</td>
                          <td className="py-3 text-right font-mono text-slate-500">{formatCurrency(90)}</td>
                          <td className="py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(500)}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200">
                      <tr>
                        <td colSpan={3} className="py-2.5 font-bold text-slate-600 text-right">Subtotal:</td>
                        <td className="py-2.5 font-mono font-bold text-slate-900 text-right">
                          {formatCurrency(bookingResult.invoice?.subtotal || 500)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="py-1.5 font-semibold text-slate-500 text-right">GST (18%):</td>
                        <td className="py-1.5 font-mono font-semibold text-slate-600 text-right">
                          {formatCurrency(bookingResult.invoice?.taxAmount || 90)}
                        </td>
                      </tr>
                      <tr className="text-sm">
                        <td colSpan={3} className="py-3 font-black text-slate-900 text-right">Total Amount:</td>
                        <td className="py-3 font-mono font-black text-teal-800 text-right">
                          {formatCurrency(bookingResult.invoice?.total || 590)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Payment Status Stamp */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border",
                        bookingResult.invoice?.status === "PAID"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-amber-50 text-amber-800 border-amber-300"
                      )}
                    >
                      {bookingResult.invoice?.status === "PAID"
                        ? `✓ PAID (${bookingResult.payment?.method || "UPI ONLINE"})`
                        : "PAYMENT DUE AT CLINIC DESK"}
                    </div>
                    {bookingResult.payment?.referenceNumber && (
                      <span className="text-[11px] font-mono text-slate-500">
                        Ref: {bookingResult.payment.referenceNumber}
                      </span>
                    )}
                  </div>

                  <div className="text-right text-[11px] text-slate-400">
                    <p>Clinic Helpline: 080-46001234</p>
                    <p>Computer generated invoice, no signature required.</p>
                  </div>
                </div>
              </div>

              {/* Bottom Navigation Buttons (Hidden in Print) */}
              <div className="print:hidden flex justify-center gap-4 pt-4">
                <Link
                  href="/"
                  className="px-6 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Return to Homepage
                </Link>

                <Link
                  href={`/portal?phone=${encodeURIComponent(bookingResult.patient.phone)}`}
                  className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-bold shadow-xs transition"
                >
                  View in Patient Portal
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="print:hidden">
        <ClientFooter />
      </div>
    </div>
  );
}
