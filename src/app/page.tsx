"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Calendar,
  ShieldCheck,
  Award,
  Clock,
  MapPin,
  Phone,
  ArrowRight,
  CheckCircle2,
  Star,
  Users,
  Smile,
  HeartPulse,
  ReceiptText,
  ChevronDown,
  Activity,
  Zap,
  Check,
  Stethoscope,
  HeartHandshake,
  LogIn,
} from "lucide-react";
import ClientNavbar from "@/components/client/ClientNavbar";
import ClientFooter from "@/components/client/ClientFooter";
import { formatCurrency, cn } from "@/lib/utils";

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Fetch treatments
  const { data: treatmentsData } = useQuery({
    queryKey: ["public-treatments"],
    queryFn: async () => {
      const res = await fetch("/api/public/treatments");
      if (!res.ok) return { categories: [], treatments: [] };
      return res.json();
    },
  });

  // Fetch doctors
  const { data: doctorsData } = useQuery({
    queryKey: ["public-doctors"],
    queryFn: async () => {
      const res = await fetch("/api/public/doctors");
      if (!res.ok) return { data: [] };
      return res.json();
    },
  });

  const categories = treatmentsData?.categories || [];
  const treatments = treatmentsData?.treatments || [];
  const doctors = doctorsData?.data || [];

  const filteredTreatments =
    selectedCategory === "All"
      ? treatments
      : treatments.filter((t: any) => t.category?.name === selectedCategory);

  const faqs = [
    {
      q: "How can I book or reschedule my dental visit online?",
      a: "Click on 'Book Appointment' to choose your treatment, doctor, and convenient time slot. To reschedule an existing visit, access the 'Patient Portal' with your registered phone number or email and choose your new slot with instant real-time confirmation.",
    },
    {
      q: "Can I view invoices and pay my bills online?",
      a: "Yes. Our Patient Portal generates itemized tax invoices with procedure breakdowns. You can make payments via UPI (GPay, PhonePe, Paytm), Debit/Credit Cards, or NetBanking and download official tax receipts.",
    },
    {
      q: "Are the dental treatments pain-free?",
      a: "We utilize computerized local anesthesia, gentle ultrasonic scalers, and painless dental lasers to ensure minimal discomfort and anxiety-free visits.",
    },
    {
      q: "What sterilization and hygiene protocols do you follow?",
      a: "Our clinic strictly adheres to European Class-B autoclaving, 6-stage instrument sterilization, and disposable barriers for every patient following international CDC and ADA standards.",
    },
    {
      q: "What should I do in case of a dental emergency?",
      a: "For acute tooth pain, broken restorations, or dental trauma, we provide priority same-day consultations. Contact our direct emergency hotline at 080-46001234.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 selection:bg-teal-700 selection:text-white">
      <ClientNavbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-white border-b border-slate-200/80 pt-10 pb-16 sm:pt-14 sm:pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Hero Content */}
              <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
                  <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                  <span>Advanced Multispeciality Dental & Implant Clinic</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.14]">
                  Complete Dental Care with a Gentle Touch.
                </h1>

                <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                  Expert restorative, cosmetic, and surgical dental treatments delivered with modern 3D imaging, pain-free lasers, and certified dental specialists.
                </p>

                {/* Hero CTAs */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                  <Link
                    href="/book"
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Book Appointment Online</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>

                  <Link
                    href="/login?tab=patient"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm border border-slate-200 transition flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4 text-teal-700" />
                    <span>Patient Portal Login</span>
                  </Link>
                </div>

                {/* Key Benefits */}
                <div className="pt-4 grid grid-cols-3 gap-3 border-t border-slate-200 max-w-md mx-auto lg:mx-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700">Zero Wait Time</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700">Painless Care</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700">Digital Invoices</span>
                  </div>
                </div>
              </div>

              {/* Right Hero Image */}
              <div className="lg:col-span-6 relative">
                <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/hero_clinic.jpg"
                    alt="DentalCare Pro Clinic Consultation Room"
                    className="w-full h-[360px] sm:h-[420px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                  {/* Floating Info Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-200 shadow-md flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Doctor Consultations Open Today
                        </span>
                        <span className="text-[11px] text-teal-700 font-medium">
                          Mon – Sat: 9:00 AM – 7:00 PM
                        </span>
                      </div>
                    </div>

                    <Link
                      href="/book"
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition"
                    >
                      Book Slot
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS STRIP */}
        <section className="bg-slate-900 text-white py-10 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-black text-teal-400 font-mono">15,000+</div>
                <div className="text-xs text-slate-300 font-medium mt-1">Smiles Restored</div>
              </div>
              <div>
                <div className="text-3xl font-black text-sky-400 font-mono">15+ Years</div>
                <div className="text-xs text-slate-300 font-medium mt-1">Clinical Experience</div>
              </div>
              <div>
                <div className="text-3xl font-black text-emerald-400 font-mono">99.8%</div>
                <div className="text-xs text-slate-300 font-medium mt-1">Satisfaction Rate</div>
              </div>
              <div>
                <div className="text-3xl font-black text-amber-400 font-mono">100%</div>
                <div className="text-xs text-slate-300 font-medium mt-1">Class-B Sterilization</div>
              </div>
            </div>
          </div>
        </section>

        {/* TREATMENTS & PROCEDURES */}
        <section id="treatments" className="py-20 bg-slate-50/70 border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
              <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider border border-teal-200">
                Clinical Services
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Comprehensive Dental Treatments & Procedures
              </h2>
              <p className="text-sm text-slate-500 font-normal leading-relaxed">
                Select your dental concern or treatment to check specialist availability and receive a customized consultation.
              </p>
            </div>

            {/* Featured Treatment Visual Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {/* Featured 1 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col sm:flex-row gap-6 items-center shadow-xs hover-lift">
                <div className="w-full sm:w-1/2 rounded-xl overflow-hidden bg-slate-100 h-44">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/treatment_cleaning.jpg"
                    alt="Dental Cleaning & Scaling"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-full sm:w-1/2 space-y-2 text-left">
                  <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-100">
                    Preventive Care
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">Teeth Cleaning & Scaling</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ultrasonic plaque and tartar removal with stain polishing and enamel protection.
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-md border border-teal-200/60">
                      Doctor Consultation Included
                    </span>
                    <Link
                      href="/book"
                      className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg transition"
                    >
                      Select Concern
                    </Link>
                  </div>
                </div>
              </div>

              {/* Featured 2 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col sm:flex-row gap-6 items-center shadow-xs hover-lift">
                <div className="w-full sm:w-1/2 rounded-xl overflow-hidden bg-slate-100 h-44">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/treatment_aligners.jpg"
                    alt="Clear Aligners & Orthodontics"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-full sm:w-1/2 space-y-2 text-left">
                  <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 text-[10px] font-bold border border-sky-100">
                    Orthodontics
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">Clear Invisible Aligners</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Discreet 3D digital alignment to straighten smiles comfortably with zero metal brackets.
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded-md border border-sky-200/60">
                      3D Scan & Evaluation
                    </span>
                    <Link
                      href="/book"
                      className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg transition"
                    >
                      Consult Doctor
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 mb-6">
              <button
                onClick={() => setSelectedCategory("All")}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap",
                  selectedCategory === "All"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                )}
              >
                All Procedures ({treatments.length})
              </button>

              {categories.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap",
                    selectedCategory === cat.name
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Treatment Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTreatments.map((t: any) => (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-teal-600 hover:shadow-md transition-all flex flex-col justify-between group hover-lift"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-100">
                        {t.category?.name || "General"}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t.duration} mins</span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {t.name}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {t.description || "Comprehensive clinical procedure performed with modern dental technology."}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />
                      <span className="font-medium">Specialist Care</span>
                    </div>

                    <Link
                      href={`/book?treatmentId=${t.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition flex items-center gap-1"
                    >
                      <span>Book Visit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* OUR SPECIALISTS DOCTORS WITH REAL PHOTOS */}
        <section id="doctors" className="py-20 bg-white border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-2 mb-14">
              <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider border border-teal-200">
                Medical Leadership
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Our Specialist Dental Team
              </h2>
              <p className="text-slate-500 text-sm sm:text-base">
                Meet our certified oral surgeons, orthodontists, and restorative endodontists.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {doctors.map((doc: any) => (
                <div
                  key={doc.id}
                  className="bg-[#F8FAFC] rounded-2xl overflow-hidden border border-slate-200 hover:border-teal-600 hover:shadow-md transition-all flex flex-col justify-between hover-lift"
                >
                  <div>
                    {/* Doctor Photo */}
                    <div className="relative h-64 w-full bg-slate-200 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={doc.avatar || "/images/doctor_ananya.jpg"}
                        alt={doc.name}
                        className="w-full h-full object-cover object-top"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-teal-700 text-white shadow-xs">
                          {doc.specialization}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-2">
                      <h3 className="text-lg font-bold text-slate-900">{doc.name}</h3>
                      <p className="text-xs font-bold text-teal-700">{doc.qualification}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {doc.bio || "Dedicated to providing gentle, high-precision dental care."}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <Link
                      href={`/book?doctorId=${doc.id}`}
                      className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book with {doc.name.split(" ")[1] || doc.name}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CLINIC FACILITY & AMENITIES */}
        <section id="facilities" className="py-20 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 space-y-6">
                <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
                  Hospital-Grade Clinic Facility
                </span>

                <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                  Modern Infrastructure Designed for Hygiene & Safety.
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed">
                  We adhere to strict international cleanliness standards. Every instrument and room undergoes multi-step chemical and autoclave sterilization.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">European Class-B Autoclaves</h4>
                      <p className="text-xs text-slate-400 mt-0.5">100% sterile handpieces and instruments.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Low-Dose Digital 3D Imaging</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Instant diagnostic clarity with 90% reduced radiation.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <ReceiptText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Paperless Digital Records & Mobile Portal</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Access bills, prescriptions, and visit histories 24/7.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Facility Interior Image */}
              <div className="lg:col-span-6">
                <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-800 bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/facility_interior.jpg"
                    alt="DentalCare Pro Clinic Facility & Waiting Suite"
                    className="w-full h-80 sm:h-96 object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-2 mb-12">
              <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider border border-teal-200">
                Help & Patient Support
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-3.5">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-[#F8FAFC] rounded-2xl border border-slate-200 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-5 text-left font-bold text-slate-900 flex items-center justify-between gap-4 hover:bg-slate-100 cursor-pointer"
                  >
                    <span className="text-sm sm:text-base">{faq.q}</span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200",
                        openFaq === idx && "rotate-180 text-teal-700"
                      )}
                    />
                  </button>

                  {openFaq === idx && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/80 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CALL TO ACTION */}
        <section className="py-16 bg-teal-800 text-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Ready to Book Your Dental Consultation?
            </h2>
            <p className="text-teal-100 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Book your appointment in under 60 seconds or access your bills and prescriptions on the Patient Portal.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link
                href="/book"
                className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-100 text-teal-900 font-bold text-sm rounded-xl shadow-md transition"
              >
                Book Appointment Online
              </Link>
              <Link
                href="/login?tab=patient"
                className="w-full sm:w-auto px-7 py-3.5 bg-teal-900/80 hover:bg-teal-900 text-white font-bold text-sm rounded-xl border border-white/20 transition flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Patient Portal Login</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <ClientFooter />
    </div>
  );
}
