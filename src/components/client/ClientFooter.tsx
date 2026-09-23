import Link from "next/link";
import {
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Award,
  HeartHandshake,
  ArrowRight,
} from "lucide-react";

export default function ClientFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      {/* Top Value Banner */}
      <div className="border-b border-slate-800/80 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-white font-bold text-base">Certified Specialists</h4>
                <p className="text-xs text-slate-400 mt-0.5">Experienced MDS surgeons, orthodontists & endodontists.</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-white font-bold text-base">100% Sterile & Painless</h4>
                <p className="text-xs text-slate-400 mt-0.5">Hospital-grade sterilization with laser dentistry equipment.</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-white font-bold text-base">Transparent Pricing</h4>
                <p className="text-xs text-slate-400 mt-0.5">No hidden charges, digital GST invoices & easy online payment.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Clinic Brand */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                <img
                  src="/images/logo.png"
                  alt="DentiFlow"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white">
                  Denti<span className="text-teal-400">Flow</span>
                </span>
                <p className="text-[11px] font-medium text-slate-400">
                  Comprehensive Dental Care & Laser Center
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Providing modern, compassionate dental treatments with advanced digital technology. From routine scaling to full mouth implants, we keep your smile radiant and healthy.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold transition shadow-md glass-shimmer"
              >
                <span>Book Appointment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/portal"
                className="inline-flex items-center gap-2 px-4 py-2 glass-dark-card hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700"
              >
                <span>Patient Portal</span>
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Patient Care</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/book" className="hover:text-white transition">Book Appointment</Link>
              </li>
              <li>
                <Link href="/portal" className="hover:text-white transition">Patient Self-Service Portal</Link>
              </li>
              <li>
                <Link href="/portal" className="hover:text-white transition">View & Pay Invoices</Link>
              </li>
              <li>
                <Link href="/portal" className="hover:text-white transition">Reschedule Appointment</Link>
              </li>
              <li>
                <Link href="/#treatments" className="hover:text-white transition">Treatment Fee Schedule</Link>
              </li>
            </ul>
          </div>

          {/* Treatments */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Popular Services</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/book" className="hover:text-white transition">Teeth Cleaning & Scaling</Link></li>
              <li><Link href="/book" className="hover:text-white transition">Root Canal Treatment</Link></li>
              <li><Link href="/book" className="hover:text-white transition">Dental Implants</Link></li>
              <li><Link href="/book" className="hover:text-white transition">Clear Aligners & Braces</Link></li>
              <li><Link href="/book" className="hover:text-white transition">Laser Teeth Whitening</Link></li>
              <li><Link href="/book" className="hover:text-white transition">Zirconia Crowns</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Contact & Hours</h4>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>12, Rajpath Avenue, Koramangala, Bengaluru, Karnataka</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-teal-400 shrink-0" />
                <a href="tel:08046001234" className="hover:text-white font-medium">080-46001234</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                <a href="mailto:info@dentalcarepro.in" className="hover:text-white">info@dentalcarepro.in</a>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">Mon – Sat: 9:00 AM – 7:00 PM</p>
                  <p className="text-slate-400">Sunday: Emergency On-Call</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & disclaimer */}
        <div className="mt-12 pt-8 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} DentalCare Pro Clinic. All rights reserved. GSTIN: 29ABCDE1234F1ZX.</p>
          <div className="flex items-center gap-4">
            <Link href="/portal" className="hover:text-white">Patient Portal</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-white">Staff Login</Link>
            <span>•</span>
            <span className="text-slate-400">Privacy & Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
