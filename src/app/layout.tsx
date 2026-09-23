import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Providers from "@/components/providers";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DentalCare Pro — Dental Clinic Management System",
    template: "%s | DentalCare Pro",
  },
  description:
    "Professional dental clinic management software for appointments, patients, billing, and more.",
  robots: "noindex, nofollow", // Private healthcare application
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${outfit.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="font-sans antialiased selection:bg-teal-600 selection:text-white">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
