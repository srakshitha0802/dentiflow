"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validations";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  Phone,
  User,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
          Loading login portal...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "staff" ? "staff" : "patient";
  const [activeTab, setActiveTab] = useState<"patient" | "staff">(defaultTab);

  // Patient Login State
  const [patientIdentifier, setPatientIdentifier] = useState("");
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);

  // Staff Login State
  const [showPassword, setShowPassword] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  // Handle Patient Portal Login
  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientIdentifier.trim()) {
      return setPatientError("Please enter your Phone Number, Email, or Patient ID.");
    }
    setPatientLoading(true);
    setPatientError(null);

    try {
      const res = await fetch(
        `/api/patient/portal?identifier=${encodeURIComponent(patientIdentifier.trim())}`
      );
      const json = await res.json();
      if (!res.ok) {
        setPatientError(json.error || "No patient record found for this identifier.");
      } else {
        // Save in localStorage for persistent session
        if (typeof window !== "undefined") {
          localStorage.setItem("patientIdentifier", patientIdentifier.trim());
        }
        toast.success(`Welcome back, ${json.patient.firstName}!`);
        router.push(`/portal?phone=${encodeURIComponent(patientIdentifier.trim())}`);
      }
    } catch {
      setPatientError("Failed to connect to the clinic server. Please try again.");
    } finally {
      setPatientLoading(false);
    }
  };

  // Handle Staff Login
  const onStaffSubmit = async (data: LoginForm) => {
    setStaffLoading(true);
    setStaffError(null);

    try {
      const callbackUrl = searchParams?.get("callbackUrl") ?? "/dashboard";
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setStaffError("Invalid credentials. Please verify your email and password.");
      } else {
        toast.success("Signed in successfully.");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setStaffError("An unexpected error occurred. Please try again.");
    } finally {
      setStaffLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      {/* Top Simple Bar */}
      <header className="px-6 py-4 border-b border-slate-200/80 bg-white flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center shadow-xs">
            <img
              src="/images/logo.png"
              alt="DentiFlow"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-bold text-slate-900 text-lg">
            Denti<span className="text-teal-700">Flow</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500 hidden sm:inline">New patient?</span>
          <Link
            href="/book"
            className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg transition"
          >
            Book Appointment
          </Link>
        </div>
      </header>

      {/* Main Center Login Box */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Login</h1>
            <p className="text-xs text-slate-500">
              Access patient records or manage clinic operations
            </p>
          </div>

          {/* Dual Login Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab("patient")}
              className={cn(
                "py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer",
                activeTab === "patient"
                  ? "bg-white text-teal-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <User className="w-4 h-4 text-teal-700" />
              <span>Patient Portal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("staff")}
              className={cn(
                "py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer",
                activeTab === "staff"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Lock className="w-4 h-4 text-slate-700" />
              <span>Clinic Staff</span>
            </button>
          </div>

          {/* TAB 1: PATIENT PORTAL LOGIN */}
          {activeTab === "patient" && (
            <form onSubmit={handlePatientLogin} className="space-y-4 animate-in fade-in duration-150">
              {patientError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{patientError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Phone Number, Email, or Patient ID
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9811111111 or PAT-00001"
                    value={patientIdentifier}
                    onChange={(e) => setPatientIdentifier(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter the phone number or email you provided during appointment booking.
                </p>
              </div>

              <button
                type="submit"
                disabled={patientLoading}
                className="w-full h-11 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {patientLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Patient...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Patient Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
                Need to book a new appointment?{" "}
                <Link href="/book" className="text-teal-700 font-bold hover:underline">
                  Book Online
                </Link>
              </div>
            </form>
          )}

          {/* TAB 2: CLINIC STAFF LOGIN */}
          {activeTab === "staff" && (
            <form
              onSubmit={handleSubmit(onStaffSubmit)}
              className="space-y-4 animate-in fade-in duration-150"
            >
              {staffError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{staffError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Staff Email Address
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="name@dentalcare.com"
                  {...register("email")}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter staff password"
                    {...register("password")}
                    className="w-full h-11 pl-3 pr-10 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    {...register("rememberMe")}
                    className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  />
                  <span>Remember session</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-teal-700 font-semibold hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={staffLoading}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {staffLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign into Clinic Dashboard</span>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200 bg-white">
        © {new Date().getFullYear()} DentalCare Pro Clinic. HIPAA & NABH Compliant System.
      </footer>
    </div>
  );
}
