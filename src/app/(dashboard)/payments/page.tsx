"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  DollarSign,
  User,
  Receipt,
  CheckCircle2,
  X
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";

interface Payment {
  id: string;
  paymentId: string;
  amount: number;
  method: string;
  referenceNumber?: string;
  date: string;
  notes?: string;
  patient: {
    id: string;
    patientId: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    total: number;
    balanceDue: number;
  };
  recordedBy: {
    name: string;
  };
}

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["payments", methodFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (methodFilter) params.append("method", methodFilter);
      if (searchQuery) params.append("search", searchQuery);
      const res = await fetch(`/api/payments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
  });

  const payments: Payment[] = responseData?.data || [];

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments Ledger</h1>
          <p className="text-sm text-slate-500 mt-1">Audit trail of cash, card, UPI, and bank transfer receipts collected.</p>
        </div>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Transactions</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{payments.length}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm sm:col-span-2">
          <span className="text-xs text-emerald-600 font-bold">Total Amount Collected</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(totalCollected)}</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payments by patient or transaction ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { label: "All Methods", value: "" },
            { label: "Cash", value: "CASH" },
            { label: "Card", value: "CARD" },
            { label: "UPI", value: "UPI" },
            { label: "Bank Transfer", value: "BANK_TRANSFER" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setMethodFilter(tab.value)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer",
                methodFilter === tab.value
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading payment records...</div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No payment records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Receipt ID</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Invoice Ref</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {p.paymentId}
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {p.patient.firstName} {p.patient.lastName}
                      </div>
                      <div className="text-xs text-slate-400">{p.patient.phone}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-blue-600 font-semibold">
                      {p.invoice.invoiceNumber}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap font-bold text-emerald-700">
                      {formatCurrency(p.amount)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold">
                        {p.method}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                      {format(parseISO(p.date), "MMM d, yyyy · hh:mm a")}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      {p.recordedBy?.name || "Reception"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
