"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Phone,
  User,
  Menu,
  X,
  Sparkles,
  ReceiptText,
  Clock,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBasePath } from "@/lib/basePath";


export default function ClientNavbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Treatments & Fees", href: "/#treatments" },
    { label: "Our Specialists", href: "/#doctors" },
    { label: "Clinic Facility", href: "/#facilities" },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/60 shadow-sm transition-all backdrop-blur-xl">
      {/* Top Clinical Header Ribbon */}
      <div className="bg-slate-950/95 text-white text-xs py-1.5 px-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span className="font-semibold text-slate-200">
              DentalCare Pro Clinic
            </span>
            <span className="hidden md:inline text-slate-400 text-xs">
              • 12, Rajpath Avenue, Bengaluru • Mon – Sat: 9:00 AM – 7:00 PM
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <a
              href="tel:08046001234"
              className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-semibold transition"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>080-46001234</span>
            </a>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <Link
              href="/login?tab=staff"
              className="text-slate-400 hover:text-white transition flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>Staff Login</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-slate-900 shrink-0 group-hover:border-teal-500 transition-colors">
              <img
                src={`${getBasePath()}/images/logo.png`}
                alt="DentiFlow Logo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  Denti<span className="text-teal-700">Flow</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-50 text-teal-800 rounded-md border border-teal-200/80 shadow-xs">
                  CLINIC
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 tracking-wide">
                Premier Dental Care & Surgery
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/60 p-1.5 rounded-2xl border border-slate-200/60 backdrop-blur-md">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    isActive
                      ? "text-teal-900 bg-white shadow-xs font-black border border-slate-200/70"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action CTA Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link
              href="/login?tab=patient"
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-teal-900 glass-pill hover:bg-white transition-all flex items-center gap-1.5 border border-slate-200/90 shadow-xs hover-lift"
            >
              <LogIn className="w-4 h-4 text-teal-700" />
              <span>Patient Login</span>
            </Link>

            <Link
              href="/book"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white text-xs font-bold shadow-md hover:shadow-teal-700/25 transition-all flex items-center gap-2 glass-shimmer"
            >
              <Calendar className="w-4 h-4 text-teal-200" />
              <span>Book Appointment</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-xl">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block px-3 py-2.5 rounded-xl text-sm font-semibold transition",
                  pathname === link.href
                    ? "bg-teal-50 text-teal-800 font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/book"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 text-center bg-teal-700 text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Appointment Online</span>
            </Link>

            <Link
              href="/login?tab=patient"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 text-center bg-slate-100 text-slate-800 font-bold text-sm rounded-xl border border-slate-200 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4 text-teal-700" />
              <span>Patient Portal Login</span>
            </Link>

            <Link
              href="/login?tab=staff"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2 text-center text-slate-500 hover:text-slate-800 font-medium text-xs flex items-center justify-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Clinic Staff Login</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
