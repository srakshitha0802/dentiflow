"use client";

import { useState, useRef } from "react";
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
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import ClientNavbar from "@/components/client/ClientNavbar";
import ClientFooter from "@/components/client/ClientFooter";
import { formatCurrency, cn } from "@/lib/utils";
import { getBasePath } from "@/lib/basePath";



// ─── Static fallback data shown when API is unavailable (GitHub Pages / static export) ───
const STATIC_TREATMENTS = [
  { id: "t1", name: "Teeth Cleaning & Scaling", category: { name: "Preventive" }, duration: 45, description: "Ultrasonic plaque and tartar removal with stain polishing and enamel protection." },
  { id: "t2", name: "Root Canal Treatment", category: { name: "Restorative" }, duration: 90, description: "Pain-free computerized root canal with biocompatible fillings and digital X-ray guidance." },
  { id: "t3", name: "Dental Implants", category: { name: "Surgical" }, duration: 120, description: "Titanium implant placement with 3D guided surgery for a permanent natural-looking tooth." },
  { id: "t4", name: "Clear Invisible Aligners", category: { name: "Orthodontic" }, duration: 60, description: "Discreet 3D digital alignment to straighten smiles with zero metal brackets." },
  { id: "t5", name: "Laser Teeth Whitening", category: { name: "Cosmetic" }, duration: 60, description: "Advanced laser whitening to brighten your smile by up to 8 shades in a single visit." },
  { id: "t6", name: "Zirconia Dental Crowns", category: { name: "Restorative" }, duration: 90, description: "Precision-milled tooth-colored zirconia crowns for superior strength and aesthetics." },
  { id: "t7", name: "Wisdom Tooth Extraction", category: { name: "Surgical" }, duration: 60, description: "Safe and gentle surgical removal under local anaesthesia with post-op care guidance." },
  { id: "t8", name: "Gum Disease Treatment", category: { name: "Preventive" }, duration: 60, description: "Deep cleaning and laser therapy for gingivitis, periodontitis, and bleeding gums." },
  { id: "t9", name: "Full Mouth Rehabilitation", category: { name: "Cosmetic" }, duration: 180, description: "Comprehensive restoration combining crowns, veneers, implants, and whitening for a complete smile makeover." },
];

const STATIC_CATEGORIES = [
  { id: "c1", name: "Preventive" },
  { id: "c2", name: "Restorative" },
  { id: "c3", name: "Surgical" },
  { id: "c4", name: "Orthodontic" },
  { id: "c5", name: "Cosmetic" },
];

const STATIC_DOCTORS = (basePath: string) => [
  {
    id: "d1",
    name: "Dr. Ananya Rao",
    specialization: "Chief Dental Surgeon",
    qualification: "BDS, MDS (Oral & Maxillofacial Surgery)",
    bio: "12+ years of clinical excellence in complex implant surgeries and full-mouth rehabilitation. Pioneer of painless laser dentistry in Bengaluru.",
    avatar: `${basePath}/images/doctor_ananya.jpg`,
  },
  {
    id: "d2",
    name: "Dr. Vikram Sethi",
    specialization: "Orthodontist & Aligner Specialist",
    qualification: "BDS, MDS (Orthodontics)",
    bio: "Expert in clear aligner therapy and lingual braces. Certified Invisalign provider with 1,500+ successful alignment cases.",
    avatar: `${basePath}/images/doctor_arjun.jpg`,
  },
  {
    id: "d3",
    name: "Dr. Sneha Patil",
    specialization: "Cosmetic & Restorative Dentist",
    qualification: "BDS, MDS (Conservative Dentistry & Endodontics)",
    bio: "Specialist in smile design, zirconia veneers, and painless root canal treatments with digital magnification loupe technology.",
    avatar: `${basePath}/images/doctor_priya.jpg`,
  },
];

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Fetch treatments
  const { data: treatmentsData } = useQuery({
    queryKey: ["public-treatments"],
    queryFn: async () => {
      const res = await fetch("/api/public/treatments");
      if (!res.ok) return { categories: [], treatments: [] };
      return res.json();
    },
    enabled: typeof window !== "undefined",
  });

  // Fetch doctors
  const { data: doctorsData } = useQuery({
    queryKey: ["public-doctors"],
    queryFn: async () => {
      const res = await fetch("/api/public/doctors");
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: typeof window !== "undefined",
  });

  // Fetch verified patient feedbacks & rating stats
  const { data: feedbackData } = useQuery({
    queryKey: ["public-feedback"],
    queryFn: async () => {
      const res = await fetch("/api/public/feedback");
      if (!res.ok) return { feedbacks: [], stats: { total: 0, averageRating: 5.0, satisfactionPercent: 99.8, distribution: {} } };
      return res.json();
    },
    enabled: typeof window !== "undefined",
  });


  const categories = treatmentsData?.categories?.length ? treatmentsData.categories : STATIC_CATEGORIES;
  const treatments = treatmentsData?.treatments?.length ? treatmentsData.treatments : STATIC_TREATMENTS;
  const basePath = getBasePath();
  const doctors = doctorsData?.data?.length ? doctorsData.data : STATIC_DOCTORS(basePath);

  const publicFeedbacks = feedbackData?.feedbacks || [];
  const feedbackStats = feedbackData?.stats || {
    total: 0,
    averageRating: 4.9,
    satisfactionPercent: 99.8,
    distribution: {},
  };

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
    <div className="min-h-screen flex flex-col bg-[#FAFBFD] text-slate-900 selection:bg-teal-700 selection:text-white relative overflow-x-hidden">
      <ClientNavbar />

      <main className="flex-1">
        {/* HERO SECTION — VIVID CINEMATIC VIDEO BACKGROUND WITH CRYSTAL GLASS UI */}
        <section className="relative overflow-hidden min-h-[90vh] lg:min-h-[94vh] flex items-center justify-center text-white">
          {/* Background Video Element — Crisp, clear, and fully visible */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <video
              ref={videoRef}
              src={`${getBasePath()}/teethvideo.mp4`}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              preload="auto"
              className="w-full h-full object-cover object-center scale-[1.01] transition-transform duration-700"
            />
            {/* Ultra-light ambient veil to let the video shine while giving text subtle contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 via-slate-950/20 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/30 pointer-events-none" />
          </div>

          {/* Ambient Glow Auroras */}
          <div className="absolute top-1/4 left-[-8%] w-[500px] h-[500px] rounded-full bg-teal-400/20 blur-[130px] pointer-events-none animate-aura z-1" />
          <div className="absolute bottom-10 right-[-5%] w-[550px] h-[550px] rounded-full bg-sky-400/20 blur-[140px] pointer-events-none animate-aura z-1" style={{ animationDelay: "-4s" }} />

          {/* Foreground Hero Content wrapped in Crystal Glass Container for Supreme Readability */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 relative z-10 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              
              {/* Left Column: Hero Glass Card */}
              <div className="lg:col-span-7 glass-card-dark p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] space-y-6 text-center lg:text-left animate-slide-up border border-white/25 shadow-2xl backdrop-blur-xl">
                {/* Frosted Crystal Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill-dark text-teal-300 text-xs font-bold shadow-lg hover-lift cursor-default border border-teal-400/40">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                  <span className="tracking-wide">Multispeciality Dental & Implant Center</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] font-black text-white tracking-tight leading-[1.12] drop-shadow-md font-heading">
                  Complete Dental Care with a{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-200 to-sky-300 drop-shadow-sm">
                    Gentle Touch.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-100 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal drop-shadow-sm">
                  Expert restorative, cosmetic, and surgical dental treatments delivered with modern 3D imaging, pain-free lasers, and certified dental specialists.
                </p>

                {/* Hero Glassy Animated CTAs */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                  <Link
                    href="/book"
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl btn-glass-primary text-white text-sm shadow-xl transition-all flex items-center justify-center gap-2 glass-shimmer group"
                  >
                    <Calendar className="w-4.5 h-4.5 text-white group-hover:scale-110 transition-transform" />
                    <span>Book Appointment Online</span>
                    <ArrowRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1.5 transition-transform" />
                  </Link>

                  <Link
                    href="/login?tab=patient"
                    className="w-full sm:w-auto px-7 py-4 rounded-2xl btn-glass-secondary text-white text-sm transition-all flex items-center justify-center gap-2 shadow-lg group"
                  >
                    <LogIn className="w-4.5 h-4.5 text-teal-300 group-hover:scale-110 transition-transform" />
                    <span>Patient Portal Login</span>
                  </Link>
                </div>

                {/* Glass Micro Benefit Pills */}
                <div className="pt-4 grid grid-cols-3 gap-3 border-t border-white/15 max-w-xl mx-auto lg:mx-0 text-left">
                  <div className="glass-pill-dark p-3 rounded-xl flex items-center gap-2.5 shadow-sm border border-white/10 hover-lift">
                    <CheckCircle2 className="w-4.5 h-4.5 text-teal-300 shrink-0" />
                    <span className="text-xs font-bold text-slate-100">Zero Wait Time</span>
                  </div>
                  <div className="glass-pill-dark p-3 rounded-xl flex items-center gap-2.5 shadow-sm border border-white/10 hover-lift">
                    <CheckCircle2 className="w-4.5 h-4.5 text-teal-300 shrink-0" />
                    <span className="text-xs font-bold text-slate-100">Painless Laser</span>
                  </div>
                  <div className="glass-pill-dark p-3 rounded-xl flex items-center gap-2.5 shadow-sm border border-white/10 hover-lift">
                    <CheckCircle2 className="w-4.5 h-4.5 text-teal-300 shrink-0" />
                    <span className="text-xs font-bold text-slate-100">Digital Invoices</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Floating Live Status & Doctor Showcase Glass Card */}
              <div className="lg:col-span-5 relative animate-scale-in">
                <div className="glass-card-dark p-6 sm:p-7 rounded-3xl shadow-2xl border border-white/25 space-y-6 backdrop-blur-xl">
                  {/* Header of Card */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/15">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-black uppercase text-teal-300 tracking-wider">Clinic Open Today</span>
                    </div>
                    <span className="px-3 py-1 bg-white/10 text-slate-200 text-[11px] font-bold rounded-full border border-white/15">
                      09:00 AM – 07:00 PM
                    </span>
                  </div>

                  {/* Doctor On Duty Card */}
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/15 flex items-center gap-3.5 backdrop-blur-md">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-sky-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-md shrink-0">
                      DR
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm font-heading">Dr. Ananya Rao & Team</h4>
                      <p className="text-xs text-teal-300 font-semibold">Chief Dental Surgeon & Specialists</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">BDS, MDS • 12+ Yrs Clinical Experience</p>
                    </div>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-teal-300 text-xs font-bold mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>3D Digital Scans</span>
                      </div>
                      <p className="text-[11px] text-slate-300">Micro-precision tooth modeling & diagnostics</p>
                    </div>

                    <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold mb-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Class-B Sterile</span>
                      </div>
                      <p className="text-[11px] text-slate-300">6-Stage European autoclave protocol</p>
                    </div>
                  </div>

                  {/* Fast Action Link */}
                  <Link
                    href="/book"
                    className="w-full py-3.5 px-4 btn-glass-primary text-white text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 glass-shimmer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Check Available Time Slots</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>

            </div>
          </div>

          {/* Floating Video Audio / Playback Controls in Bottom Corner */}
          <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 flex items-center gap-2 glass-pill-dark px-3.5 py-2 rounded-full border border-white/20 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 pr-2 border-r border-white/15 text-[11px] font-semibold text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span className="hidden sm:inline">Background Video</span>
            </div>
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-full hover:bg-white/15 text-white transition-all cursor-pointer"
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
              aria-label={isMuted ? "Unmute Sound" : "Mute Sound"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-teal-300" />}
            </button>
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-full hover:bg-white/15 text-white transition-all cursor-pointer"
              title={isPlaying ? "Pause Video" : "Play Video"}
              aria-label={isPlaying ? "Pause Video" : "Play Video"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-slate-400" /> : <Play className="w-3.5 h-3.5 text-teal-300" />}
            </button>
          </div>
        </section>

        {/* STATS STRIP — CLEAN FROSTED GLASS COUNTERS ON LIGHT CANVAS */}
        <section className="py-8 bg-white border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
              <div className="glass-card-clean p-5 rounded-2xl shadow-xs hover-lift">
                <div className="text-3xl sm:text-4xl font-black text-teal-700 font-mono tracking-tight">15,000+</div>
                <div className="text-xs text-slate-600 font-semibold mt-1">Smiles Restored</div>
              </div>
              <div className="glass-card-clean p-5 rounded-2xl shadow-xs hover-lift">
                <div className="text-3xl sm:text-4xl font-black text-sky-700 font-mono tracking-tight">15+ Years</div>
                <div className="text-xs text-slate-600 font-semibold mt-1">Clinical Experience</div>
              </div>
              <div className="glass-card-clean p-5 rounded-2xl shadow-xs hover-lift">
                <div className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono tracking-tight">99.8%</div>
                <div className="text-xs text-slate-600 font-semibold mt-1">Satisfaction Rate</div>
              </div>
              <div className="glass-card-clean p-5 rounded-2xl shadow-xs hover-lift">
                <div className="text-3xl sm:text-4xl font-black text-amber-600 font-mono tracking-tight">100%</div>
                <div className="text-xs text-slate-600 font-semibold mt-1">Class-B Sterilization</div>
              </div>
            </div>
          </div>
        </section>

        {/* TREATMENTS & PROCEDURES */}
        <section id="treatments" className="py-20 sm:py-24 bg-[#FAFBFD] border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
              <span className="px-3.5 py-1.5 rounded-full glass-pill-clean text-teal-900 text-xs font-bold uppercase tracking-wider shadow-xs inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                <span>Clinical Services</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
                Comprehensive Dental Treatments & Procedures
              </h2>
              <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
                Select your dental concern or treatment to check specialist availability and receive a customized consultation.
              </p>
            </div>

            {/* Featured Treatment Visual Highlights with Clean Glass Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {/* Featured 1 */}
              <div className="glass-card-clean rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row gap-6 items-center shadow-xs hover-lift group">
                <div className="w-full sm:w-1/2 rounded-2xl overflow-hidden bg-slate-100 h-48 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${getBasePath()}/images/treatment_cleaning.jpg`}
                    alt="Dental Cleaning & Scaling"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="glass-pill-clean px-2.5 py-1 rounded-lg text-teal-900 text-[11px] font-bold shadow-xs">
                      Preventive Care
                    </span>
                  </div>
                </div>
                <div className="w-full sm:w-1/2 space-y-2.5 text-left">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                    Teeth Cleaning & Scaling
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ultrasonic plaque and tartar removal with stain polishing and enamel protection.
                  </p>
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-teal-800 glass-pill-clean px-2.5 py-1 rounded-md">
                      Doctor Consultation Included
                    </span>
                    <Link
                      href="/book"
                      className="px-4 py-2 btn-glass-teal-light text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1 shrink-0 glass-shimmer"
                    >
                      <span>Select</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Featured 2 */}
              <div className="glass-card-clean rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row gap-6 items-center shadow-xs hover-lift group">
                <div className="w-full sm:w-1/2 rounded-2xl overflow-hidden bg-slate-100 h-48 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${getBasePath()}/images/treatment_aligners.jpg`}
                    alt="Clear Aligners & Orthodontics"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="glass-pill-clean px-2.5 py-1 rounded-lg text-sky-900 text-[11px] font-bold shadow-xs">
                      Orthodontics
                    </span>
                  </div>
                </div>
                <div className="w-full sm:w-1/2 space-y-2.5 text-left">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-sky-700 transition-colors font-heading">
                    Clear Invisible Aligners
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Discreet 3D digital alignment to straighten smiles comfortably with zero metal brackets.
                  </p>
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-sky-800 glass-pill-clean px-2.5 py-1 rounded-md">
                      3D Scan & Plan
                    </span>
                    <Link
                      href="/book"
                      className="px-4 py-2 btn-glass-teal-light text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1 shrink-0 glass-shimmer"
                    >
                      <span>Consult</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Filter Glass Tabs */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar">
              <button
                onClick={() => setSelectedCategory("All")}
                className={cn(
                  "px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs",
                  selectedCategory === "All"
                    ? "bg-teal-900 text-white shadow-md scale-105"
                    : "glass-pill-clean text-slate-700 hover:bg-white hover:text-slate-900"
                )}
              >
                All Procedures ({treatments.length})
              </button>

              {categories.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={cn(
                    "px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs",
                    selectedCategory === cat.name
                      ? "bg-teal-900 text-white shadow-md scale-105"
                      : "glass-pill-clean text-slate-700 hover:bg-white hover:text-slate-900"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Treatment Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTreatments.map((t: any) => (
                <div
                  key={t.id}
                  className="glass-card-clean rounded-3xl p-6 sm:p-7 transition-all flex flex-col justify-between group hover-lift shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="glass-pill-clean px-2.5 py-1 rounded-lg text-teal-900 text-[10px] font-bold">
                        {t.category?.name || "General"}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        <span>{t.duration} mins</span>
                      </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors font-heading">
                      {t.name}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {t.description || "Comprehensive clinical procedure performed with modern dental technology."}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-200/70 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />
                      <span className="font-semibold">Specialist Care</span>
                    </div>

                    <Link
                      href={`/book?treatmentId=${t.id}`}
                      className="px-4 py-2 rounded-xl btn-glass-teal-light text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm glass-shimmer"
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

        {/* OUR SPECIALISTS DOCTORS */}
        <section id="doctors" className="py-20 sm:py-24 bg-white border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
              <span className="px-3.5 py-1.5 rounded-full glass-pill-clean text-teal-900 text-xs font-bold uppercase tracking-wider shadow-xs inline-flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                <span>Medical Leadership</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-heading">
                Our Specialist Dental Team
              </h2>
              <p className="text-slate-600 text-sm sm:text-base">
                Meet our certified oral surgeons, orthodontists, and restorative endodontists.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {doctors.map((doc: any) => (
                <div
                  key={doc.id}
                  className="glass-card-clean rounded-3xl overflow-hidden shadow-xs transition-all flex flex-col justify-between hover-lift group"
                >
                  <div>
                    {/* Doctor Photo */}
                    <div className="relative h-68 w-full bg-slate-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={doc.avatar || `${getBasePath()}/images/doctor_ananya.jpg`}
                        alt={doc.name}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4">
                        <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-teal-700 text-white shadow-xs font-heading">
                          {doc.specialization}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 space-y-2">
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-teal-700 transition-colors font-heading">
                        {doc.name}
                      </h3>
                      <p className="text-xs font-bold text-teal-700">{doc.qualification}</p>
                      <p className="text-xs text-slate-500 leading-relaxed pt-1">
                        {doc.bio || "Dedicated to providing gentle, high-precision dental care."}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <Link
                      href={`/book?doctorId=${doc.id}`}
                      className="w-full py-3 btn-glass-teal-light text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm glass-shimmer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-teal-200" />
                      <span>Book with {doc.name.split(" ")[1] || doc.name}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CLINIC FACILITY & AMENITIES — CLEAN HIGH-TECH SHOWCASE */}
        <section id="facilities" className="py-20 sm:py-24 bg-[#FAFBFD] border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <span className="px-3.5 py-1.5 rounded-full glass-pill-clean text-teal-900 text-xs font-bold inline-flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                  <span>Hospital-Grade Clinic Facility</span>
                </span>

                <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight font-heading">
                  Modern Infrastructure Designed for Hygiene & Safety.
                </h2>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                  We adhere to strict international cleanliness standards. Every instrument and room undergoes multi-step chemical and autoclave sterilization.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="glass-card-clean p-4 rounded-2xl flex items-start gap-4 hover-lift">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-heading">European Class-B Autoclaves</h4>
                      <p className="text-xs text-slate-500 mt-0.5">100% sterile handpieces and instruments vacuum-sealed per patient.</p>
                    </div>
                  </div>

                  <div className="glass-card-clean p-4 rounded-2xl flex items-start gap-4 hover-lift">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-heading">Low-Dose Digital 3D Imaging</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Instant diagnostic clarity with up to 90% reduced radiation.</p>
                    </div>
                  </div>

                  <div className="glass-card-clean p-4 rounded-2xl flex items-start gap-4 hover-lift">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200">
                      <ReceiptText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-heading">Paperless Digital Records & Mobile Portal</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Access bills, prescriptions, and visit histories securely 24/7.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Facility Interior Image with Glass Bezel */}
              <div className="lg:col-span-6">
                <div className="glass-video-bezel rounded-3xl overflow-hidden shadow-lg">
                  <div className="relative rounded-2xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${getBasePath()}/images/facility_interior.jpg`}
                      alt="DentalCare Pro Clinic Facility & Waiting Suite"
                      className="w-full h-80 sm:h-[420px] object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 glass-card-clean p-3.5 rounded-xl flex items-center justify-between bg-white/95">
                      <div className="flex items-center gap-2.5">
                        <Award className="w-5 h-5 text-teal-700" />
                        <span className="text-xs font-bold text-slate-900 font-heading">ISO 9001 Certified Clinical Protocols</span>
                      </div>
                      <span className="text-[11px] text-teal-700 font-bold">100% Sterile</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PATIENT REVIEWS & CLINICAL TESTIMONIALS */}
        <section id="reviews" className="py-20 sm:py-24 bg-white border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="space-y-3 max-w-2xl">
                <span className="px-3.5 py-1.5 rounded-full glass-pill-clean text-amber-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit shadow-xs">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Real Patient Feedback</span>
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-heading">
                  Trusted by Over 15,000+ Happy Smiles
                </h2>
                <p className="text-slate-600 text-sm sm:text-base font-normal">
                  Read genuine reviews and treatment experiences submitted by verified clinic patients.
                </p>
              </div>

              {/* Rating Summary Glass Card & Portal Feedback CTA */}
              <div className="flex flex-wrap items-center gap-4 glass-card-clean p-4 rounded-3xl shadow-xs">
                <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">
                    {feedbackStats.averageRating || "4.9"}
                  </span>
                  <div>
                    <div className="flex items-center text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      {feedbackStats.total > 0 ? `${feedbackStats.total} Verified Reviews` : "150+ Verified Ratings"}
                    </span>
                  </div>
                </div>

                <Link
                  href="/portal?tab=feedback"
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5 glass-shimmer hover-lift"
                >
                  <Star className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Give Patient Feedback</span>
                </Link>
              </div>
            </div>

            {/* Testimonials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(publicFeedbacks.length > 0 ? publicFeedbacks : [
                {
                  id: "demo-1",
                  patientName: "Kavitha Sundaram",
                  rating: 5,
                  category: "TREATMENT",
                  treatment: "Root Canal & Zirconia Crown",
                  doctorName: "Dr. Ananya Rao",
                  comment: "Completely pain-free root canal treatment! Dr. Ananya was so gentle and explained each step with the digital X-ray screen. Highly recommended!",
                  createdAt: new Date().toISOString(),
                },
                {
                  id: "demo-2",
                  patientName: "Rahul Verma",
                  rating: 5,
                  category: "DOCTOR",
                  treatment: "Clear Aligners Consultation",
                  doctorName: "Dr. Vikram Sethi",
                  comment: "The 3D smile simulation was impressive! Professional staff, sparkling clean treatment rooms, and zero wait time.",
                  createdAt: new Date().toISOString(),
                },
                {
                  id: "demo-3",
                  patientName: "Meera Krishnan",
                  rating: 5,
                  category: "CLEANLINESS",
                  treatment: "Ultrasonic Teeth Cleaning",
                  doctorName: "Dr. Sneha Patil",
                  comment: "Hospital-grade European sterilization standards and courteous reception team. Downloading bills and records on the mobile portal is super convenient!",
                  createdAt: new Date().toISOString(),
                },
              ]).map((review: any) => (
                <div
                  key={review.id}
                  className="glass-card-clean rounded-3xl p-6 sm:p-7 hover:border-amber-400 transition-all flex flex-col justify-between space-y-4 hover-lift shadow-xs"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              "w-4 h-4",
                              s <= review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-200"
                            )}
                          />
                        ))}
                      </div>

                      {review.treatment && (
                        <span className="glass-pill-clean px-2.5 py-1 rounded-full text-[10px] font-bold text-teal-900 truncate max-w-[160px]">
                          {review.treatment}
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                  </div>

                  <div className="pt-3.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-black flex items-center justify-center text-xs shadow-xs border border-teal-200 font-heading">
                        {review.patientName?.charAt(0) || "P"}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block font-heading">{review.patientName}</span>
                        {review.doctorName ? (
                          <span className="text-[10px] text-teal-700 font-semibold">Dr. {review.doctorName.replace(/^Dr\.\s*/i, "")}</span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-semibold">Verified Patient</span>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-medium">
                      Verified Review
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <section className="py-20 sm:py-24 bg-[#FAFBFD] border-t border-slate-200/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-3 mb-12">
              <span className="px-3.5 py-1.5 rounded-full glass-pill-clean text-teal-900 text-xs font-bold uppercase tracking-wider shadow-xs inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                <span>Help & Patient Support</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-heading">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="glass-card-clean rounded-2xl overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left font-bold text-slate-900 flex items-center justify-between gap-4 hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <span className="text-sm sm:text-base font-bold font-heading">{faq.q}</span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300",
                        openFaq === idx && "rotate-180 text-teal-700"
                      )}
                    />
                  </button>

                  {openFaq === idx && (
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/70 pt-4 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CALL TO ACTION */}
        <section className="py-20 bg-white border-t border-slate-200/80 text-center relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
            <span className="px-3.5 py-1.5 rounded-full glass-pill-clean text-teal-900 text-xs font-bold inline-flex items-center gap-2 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>Instant Confirmation • Zero Waiting</span>
            </span>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-heading">
              Ready to Experience Pain-Free Dental Care?
            </h2>

            <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Book your appointment in under 60 seconds or access your bills, prescriptions, and treatment plans in the Patient Portal.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/book"
                className="w-full sm:w-auto px-8 py-4 btn-glass-teal-light text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 glass-shimmer"
              >
                <Calendar className="w-4 h-4 text-teal-200" />
                <span>Book Appointment Online</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>

              <Link
                href="/login?tab=patient"
                className="w-full sm:w-auto px-7 py-4 glass-pill-clean hover:bg-slate-100 text-slate-800 font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs hover-lift"
              >
                <LogIn className="w-4 h-4 text-teal-700" />
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


