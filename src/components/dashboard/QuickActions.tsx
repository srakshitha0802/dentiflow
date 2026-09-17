"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, UserPlus, FileText, Package, X } from "lucide-react";
import { cn } from "@/lib/utils";

const quickActions = [
  {
    label: "New Appointment",
    icon: Calendar,
    color: "bg-blue-600 text-white",
    href: "/appointments?action=new",
  },
  {
    label: "Register Patient",
    icon: UserPlus,
    color: "bg-teal-600 text-white",
    href: "/patients?action=new",
  },
  {
    label: "Create Invoice",
    icon: FileText,
    color: "bg-purple-600 text-white",
    href: "/invoices?action=new",
  },
  {
    label: "Add Item",
    icon: Package,
    color: "bg-amber-600 text-white",
    href: "/inventory?action=new",
  },
];

export default function QuickActions() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
      >
        {open ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        Quick Add
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-2 min-w-48">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.href}
                  onClick={() => {
                    router.push(action.href);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className={cn("w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0", action.color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  {action.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
