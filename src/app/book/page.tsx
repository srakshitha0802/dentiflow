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
  ReceiptText,
  Copy,
  CalendarCheck,
  Check,
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
        <div className="min-h-screen flex items-center justify-center bg-[#FAFBFB] text-slate-500 text-sm font-medium">
          Loading booking engine...
        </div>
      }
    >
      <BookAppointmentContent />
    </Suspense>
  );
}

function BookAppointmentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Multi-step wizard state
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>(
    searchParams.get("treatmentId") || ""
  );
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

  // Success screen data
  const [bookingSuccessData, setBookingSuccessData] = useState<any>(null);

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

  const selectedTreatment = useMemo(() => {
    return treatments.find((t: any) => t.id === selectedTreatmentId);
  }, [treatments, selectedTreatmentId]);

  const selectedDoctor = useMemo(() => {
    return doctors.find((d: any) => d.id === selectedDoctorId);
  }, [doctors, selectedDoctorId]);

  // 3. Fetch real-time available slots for selected date & doctor
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

      const payload = {
        ...patientForm,
        doctorId: assignedDoctorId,
        treatmentIds: selectedTreatmentId ? [selectedTreatmentId] : [],
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      };

      const res = await fetch("/api/patient/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to complete appointment booking.");
      }
      return json;
    },
    onSuccess: (data) => {
      toast.success("Appointment reserved successfully!");
      setBookingSuccessData(data.data);
      setCurrentStep(5);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Next 14 days calendar
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i);
      if (d.getDay() !== 0) {
        dates.push({
          fullDate: format(d, "yyyy-MM-dd"),
          dayName: format(d, "EEE"),
          dayNumber: format(d, "dd"),
          monthName: format(d, "MMM"),
          isToday: i === 0,
        });
      }
    }
    return dates;
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFB] text-slate-900">
      <ClientNavbar />

      <main className="flex-1 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Banner */}
          <div className="text-center space-y-2 mb-8">
            <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider border border-teal-200">
              Online Appointment Booking
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
              Reserve Your Dental Visit
            </h1>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              Select your procedure, choose your preferred dentist, and reserve your slot with instant confirmation.
            </p>
          </div>

          {/* Stepper Progress Bar */}
          {currentStep < 5 && (
            <div className="bg-white p-4 rounded-2xl border border-teal-100/80 shadow-xs mb-8">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { step: 1, label: "Procedure" },
                  { step: 2, label: "Dentist" },
                  { step: 3, label: "Date & Time" },
                  { step: 4, label: "Your Details" },
                ].map((s) => (
                  <div
                    key={s.step}
                    onClick={() => {
                      if (currentStep > s.step) setCurrentStep(s.step);
                    }}
                    className={cn(
                      "flex flex-col items-center text-center p-2 rounded-xl transition cursor-pointer",
                      currentStep === s.step
                        ? "bg-teal-50 text-teal-800 font-bold border border-teal-200/60"
                        : currentStep > s.step
                        ? "text-teal-700 font-semibold"
                        : "text-slate-400 font-medium"
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1",
                        currentStep === s.step
                          ? "bg-teal-600 text-white shadow-xs"
                          : currentStep > s.step
                          ? "bg-teal-500 text-white"
                          : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {currentStep > s.step ? <CheckCircle2 className="w-4 h-4" /> : s.step}
                    </div>
                    <span className="text-xs">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1: SELECT TREATMENT */}
          {currentStep === 1 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Step 1: Select Dental Service</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose the treatment or consultation you require.
                  </p>
                </div>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60">
                  {treatments.length} Available
                </span>
              </div>

              {treatmentsLoading ? (
                <div className="py-12 text-center text-slate-400">Loading services...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[480px] overflow-y-auto pr-1">
                  {treatments.map((t: any) => {
                    const isSelected = selectedTreatmentId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTreatmentId(t.id)}
                        className={cn(
                          "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group",
                          isSelected
                            ? "border-teal-600 bg-teal-50/40 shadow-sm ring-2 ring-teal-500/20"
                            : "border-slate-200 hover:border-teal-300 bg-white hover:bg-slate-50/50"
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-100">
                              {t.category?.name || "General"}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {t.duration} mins
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-800 text-sm group-hover:text-teal-700 transition-colors">
                            {t.name}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                        </div>

                        <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="font-black text-slate-900 text-sm font-mono">
                            {formatCurrency(t.price)}
                          </span>
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold",
                              isSelected
                                ? "bg-teal-600 border-teal-600 text-white"
                                : "border-slate-300 text-transparent"
                            )}
                          >
                            ✓
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedTreatmentId) {
                      return toast.error("Please select a service or consultation to proceed.");
                    }
                    setCurrentStep(2);
                  }}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Dentist</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE DOCTOR WITH REALISTIC PHOTOS */}
          {currentStep === 2 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Step 2: Choose Specialist</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select your preferred dentist or choose &apos;Any Available Specialist&apos;.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Any Doctor Option */}
                <div
                  onClick={() => setSelectedDoctorId("")}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4",
                    selectedDoctorId === ""
                      ? "border-teal-600 bg-teal-50/50 shadow-sm ring-2 ring-teal-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-sky-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm">Any Available Specialist</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-100 text-teal-800 rounded-md">
                        Fastest Slot
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      We will assign the best suited specialist for your time.
                    </p>
                  </div>
                </div>

                {/* Specific Doctors with Real Photos */}
                {doctors.map((doc: any) => {
                  const isSelected = selectedDoctorId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctorId(doc.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4",
                        isSelected
                          ? "border-teal-600 bg-teal-50/50 shadow-sm ring-2 ring-teal-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-xs border border-slate-200">
                        <img
                          src={doc.avatar || "/images/doctor_ananya.jpg"}
                          alt={doc.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <h3 className="font-bold text-slate-900 text-sm">{doc.name}</h3>
                        <p className="text-xs font-bold text-teal-700">{doc.qualification}</p>
                        <p className="text-xs text-slate-500">{doc.specialization}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Date & Slot</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DATE & TIME SLOT SELECTOR */}
          {currentStep === 3 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Step 3: Select Date & Time Slot</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time slot availability for {selectedDoctor?.name || "all specialists"}.
                  </p>
                </div>
              </div>

              {/* 14-Day Date Carousel */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Choose Appointment Date
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {availableDates.map((item) => {
                    const isSelected = selectedDate === item.fullDate;
                    return (
                      <button
                        key={item.fullDate}
                        type="button"
                        onClick={() => {
                          setSelectedDate(item.fullDate);
                          setSelectedSlot(null);
                        }}
                        className={cn(
                          "px-3.5 py-2.5 rounded-2xl border text-center transition cursor-pointer min-w-[72px] shrink-0",
                          isSelected
                            ? "bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-500/20"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        <div className="text-[10px] font-bold uppercase opacity-80">{item.dayName}</div>
                        <div className="text-base font-black my-0.5">{item.dayNumber}</div>
                        <div className="text-[10px] font-medium">{item.monthName}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slots Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Available Slots on {selectedDate}
                  </label>
                  <span className="text-xs text-slate-400">
                    Duration: {selectedTreatment?.duration || 30} mins
                  </span>
                </div>

                {slotsLoading ? (
                  <div className="py-12 text-center text-slate-400">Checking doctor schedules...</div>
                ) : slots.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-500 text-xs">
                    No slots available for this date. Please pick another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {slots.map((slot: any, idx: number) => {
                      const isSelected =
                        selectedSlot?.startTime === slot.time && selectedSlot?.endTime === slot.endTime;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => {
                            if (slot.available) {
                              setSelectedSlot({
                                startTime: slot.time,
                                endTime: slot.endTime,
                                availableDoctorIds: slot.availableDoctorIds,
                              });
                            }
                          }}
                          className={cn(
                            "py-2.5 px-2 rounded-xl text-xs font-bold transition text-center",
                            isSelected
                              ? "bg-teal-700 text-white shadow-md shadow-teal-600/20 ring-2 ring-teal-500/30"
                              : slot.available
                              ? "bg-teal-50/80 hover:bg-teal-100 text-teal-900 border border-teal-200 cursor-pointer"
                              : "bg-slate-100 text-slate-400 border border-slate-200 opacity-50 cursor-not-allowed line-through"
                          )}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedSlot && (
                <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-2xl flex items-center justify-between text-xs text-teal-900">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-teal-700" />
                    <span>
                      Selected slot: <strong>{selectedDate}</strong> at{" "}
                      <strong>{selectedSlot.startTime} – {selectedSlot.endTime}</strong>
                    </span>
                  </div>
                  <span className="font-bold text-teal-800">✓ Ready</span>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedSlot) return toast.error("Please pick an available time slot.");
                    setCurrentStep(4);
                  }}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Patient Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PATIENT DETAILS */}
          {currentStep === 4 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Step 4: Patient Information</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Please provide your contact information for appointment confirmation.
                  </p>
                </div>
              </div>

              {/* Booking Summary Box */}
              <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Service</span>
                  <span className="font-bold text-slate-900">{selectedTreatment?.name || "Consultation"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Specialist</span>
                  <span className="font-bold text-slate-900">{selectedDoctor?.name || "First Available"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Date & Slot</span>
                  <span className="font-bold text-teal-800">
                    {selectedDate} ({selectedSlot?.startTime})
                  </span>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!patientForm.firstName || !patientForm.lastName || !patientForm.phone) {
                    return toast.error("Please fill all required patient details.");
                  }
                  bookMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul"
                      value={patientForm.firstName}
                      onChange={(e) => setPatientForm({ ...patientForm, firstName: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Verma"
                      value={patientForm.lastName}
                      onChange={(e) => setPatientForm({ ...patientForm, lastName: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={patientForm.phone}
                      onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. rahul.verma@example.com"
                      value={patientForm.email}
                      onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={patientForm.dateOfBirth}
                      onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Gender
                    </label>
                    <select
                      value={patientForm.gender}
                      onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                    >
                      <option value="FEMALE">Female</option>
                      <option value="MALE">Male</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Symptoms or Dental Concern (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Sensitivity in upper molar, scaling checkup..."
                    value={patientForm.notes}
                    onChange={(e) => setPatientForm({ ...patientForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={bookMutation.isPending}
                    className="px-8 py-3 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-600/20 transition flex items-center gap-2 cursor-pointer"
                  >
                    {bookMutation.isPending ? (
                      <span>Confirming Booking...</span>
                    ) : (
                      <>
                        <CalendarCheck className="w-4 h-4" />
                        <span>Confirm Appointment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 5: SUCCESS CONFIRMATION */}
          {currentStep === 5 && bookingSuccessData && (
            <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-lg border border-slate-200 text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto shadow-md shadow-teal-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-full text-xs font-bold uppercase tracking-wider">
                  Booking Confirmed
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mt-2">
                  Your Dental Visit is Scheduled!
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  We look forward to seeing you at DentalCare Pro Clinic.
                </p>
              </div>

              {/* Ticket Card */}
              <div className="max-w-md mx-auto bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Booking Reference</span>
                    <span className="text-base font-black font-mono text-teal-800">
                      {bookingSuccessData.appointmentId}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(bookingSuccessData.appointmentId);
                      toast.success("Appointment ID copied to clipboard!");
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition cursor-pointer"
                    title="Copy Appointment ID"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Patient</span>
                    <span className="font-bold text-slate-900">
                      {bookingSuccessData.patient.firstName} {bookingSuccessData.patient.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Doctor</span>
                    <span className="font-bold text-slate-900">{bookingSuccessData.doctor.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Date</span>
                    <span className="font-bold text-slate-900">
                      {format(new Date(bookingSuccessData.date), "EEE, MMM d, yyyy")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Time Slot</span>
                    <span className="font-bold text-teal-700">
                      {bookingSuccessData.startTime} – {bookingSuccessData.endTime}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>SMS & Email confirmation sent to {bookingSuccessData.patient.phone}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href={`/portal?phone=${bookingSuccessData.patient.phone}`}
                  className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <ReceiptText className="w-4 h-4" />
                  <span>View in Patient Portal</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setSelectedSlot(null);
                    setBookingSuccessData(null);
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition"
                >
                  Book Another Appointment
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <ClientFooter />
    </div>
  );
}
