"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  FileText,
  Plus,
  Search,
  CreditCard,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  User,
  Trash2,
  Receipt
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, invoiceStatusColors, cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

interface InvoiceItem {
  id?: string;
  treatmentId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  notes?: string;
  patient: {
    id: string;
    patientId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address?: string;
  };
  doctor?: {
    user: {
      name: string;
    };
  };
  items: InvoiceItem[];
  payments: Array<{
    id: string;
    paymentId: string;
    amount: number;
    method: string;
    date: string;
  }>;
}

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "new" || searchParams.get("new") === "true") {
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  // Fetch Invoices
  const { data: responseData, isLoading } = useQuery({
    queryKey: ["invoices", statusFilter, searchQuery, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", String(page));
      params.append("limit", "15");
      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
  });

  const invoices: Invoice[] = responseData?.data || [];
  const pagination = responseData?.pagination || { total: 0, totalPages: 1 };

  // Fetch Patients for dropdown
  const { data: patients = [] } = useQuery({
    queryKey: ["patients-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/patients?limit=100");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch Treatments for line-items
  const { data: treatments = [] } = useQuery({
    queryKey: ["treatments-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/treatments");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch Doctors
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/doctors");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Create Invoice Form State
  const [invoiceForm, setInvoiceForm] = useState({
    patientId: searchParams.get("patientId") || "",
    doctorId: "",
    appointmentId: searchParams.get("appointmentId") || "",
    dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    discountType: "NONE",
    discountValue: 0,
    notes: "",
    items: [
      { treatmentId: "", description: "Consultation & Examination", quantity: 1, unitPrice: 500, taxPercent: 0 },
    ],
  });

  // Compute live subtotal & total
  const computedSubtotal = invoiceForm.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const computedDiscount =
    invoiceForm.discountType === "PERCENTAGE"
      ? (computedSubtotal * invoiceForm.discountValue) / 100
      : invoiceForm.discountType === "FIXED"
      ? invoiceForm.discountValue
      : 0;
  const computedTax = invoiceForm.items.reduce((sum, it) => {
    const itemTotal = it.quantity * it.unitPrice;
    return sum + (itemTotal * (it.taxPercent || 0)) / 100;
  }, 0);
  const computedGrandTotal = Math.max(0, computedSubtotal - computedDiscount + computedTax);

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: typeof invoiceForm) => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: data.patientId,
          doctorId: data.doctorId || undefined,
          appointmentId: data.appointmentId || undefined,
          dueDate: data.dueDate,
          discountType: data.discountType,
          discountValue: Number(data.discountValue),
          notes: data.notes || undefined,
          items: data.items.map((it) => ({
            treatmentId: it.treatmentId || undefined,
            description: it.description,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            taxPercent: Number(it.taxPercent || 0),
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Invoice created successfully!");
      setIsCreateModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Record Payment State
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: "CASH",
    referenceNumber: "",
    notes: "",
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, patientId, ...data }: typeof paymentForm & { invoiceId: string; patientId: string }) => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          patientId,
          amount: Number(data.amount),
          method: data.method,
          referenceNumber: data.referenceNumber || undefined,
          notes: data.notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Payment recorded successfully!");
      setIsPaymentModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing & Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">Generate treatment invoices, collect payments, and track receivables.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by invoice # or patient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { label: "All", value: "" },
            { label: "Unpaid", value: "UNPAID" },
            { label: "Partially Paid", value: "PARTIALLY_PAID" },
            { label: "Paid", value: "PAID" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer",
                statusFilter === tab.value
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-800">No invoices found</p>
            <p className="text-sm text-slate-400 mt-1">Create an invoice for completed dental procedures.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition cursor-pointer"
            >
              Create New Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Date & Due</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Balance Due</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {inv.patient.firstName} {inv.patient.lastName}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">{inv.patient.phone}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="text-slate-900 font-semibold">{format(parseISO(inv.invoiceDate), "MMM d, yyyy")}</div>
                      <div className="text-slate-400">Due: {format(parseISO(inv.dueDate), "MMM d, yyyy")}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                      {formatCurrency(inv.total)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {inv.balanceDue > 0 ? (
                        <span className="font-bold text-red-600">{formatCurrency(inv.balanceDue)}</span>
                      ) : (
                        <span className="font-semibold text-emerald-600">Paid in Full</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                          inv.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : inv.status === "PARTIALLY_PAID"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        )}
                      >
                        {inv.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.balanceDue > 0 && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPaymentForm({
                                amount: inv.balanceDue,
                                method: "CASH",
                                referenceNumber: "",
                                notes: "",
                              });
                              setIsPaymentModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                          >
                            Pay
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsReceiptModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="View & Print Tax Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Receipt
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Create Invoice */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Generate Patient Invoice</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!invoiceForm.patientId) return toast.error("Please select a patient");
                createInvoiceMutation.mutate(invoiceForm);
              }}
              className="space-y-4 pt-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Select Patient <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={invoiceForm.patientId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, patientId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.patientId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-slate-700">Treatments & Services</span>
                  <button
                    type="button"
                    onClick={() =>
                      setInvoiceForm({
                        ...invoiceForm,
                        items: [
                          ...invoiceForm.items,
                          { treatmentId: "", description: "Additional Procedure", quantity: 1, unitPrice: 1000, taxPercent: 18 },
                        ],
                      })
                    }
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {invoiceForm.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/50 flex flex-wrap items-center gap-2 text-xs">
                      {/* Treatment selector */}
                      <select
                        value={item.treatmentId}
                        onChange={(e) => {
                          const trt = treatments.find((t: any) => t.id === e.target.value);
                          const updated = [...invoiceForm.items];
                          updated[idx] = {
                            ...updated[idx],
                            treatmentId: e.target.value,
                            description: trt ? trt.name : updated[idx].description,
                            unitPrice: trt ? trt.price : updated[idx].unitPrice,
                            taxPercent: trt ? trt.taxPercent : 18,
                          };
                          setInvoiceForm({ ...invoiceForm, items: updated });
                        }}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white w-44"
                      >
                        <option value="">Custom Service</option>
                        {treatments.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.name} (₹{t.price})
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...invoiceForm.items];
                          updated[idx].description = e.target.value;
                          setInvoiceForm({ ...invoiceForm, items: updated });
                        }}
                        className="flex-1 min-w-[120px] px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />

                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...invoiceForm.items];
                          updated[idx].quantity = Number(e.target.value);
                          setInvoiceForm({ ...invoiceForm, items: updated });
                        }}
                        className="w-14 px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-center"
                      />

                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="Price"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const updated = [...invoiceForm.items];
                            updated[idx].unitPrice = Number(e.target.value);
                            setInvoiceForm({ ...invoiceForm, items: updated });
                          }}
                          className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg bg-white font-bold"
                        />
                      </div>

                      {invoiceForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceForm({
                              ...invoiceForm,
                              items: invoiceForm.items.filter((_, i) => i !== idx),
                            });
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Calculation Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(computedSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Tax GST (18%):</span>
                  <span>{formatCurrency(computedTax)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-base">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(computedGrandTotal)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  {createInvoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record Payment */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">Collect Payment</h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl my-4 text-xs">
              <div className="font-bold text-slate-900 text-sm">
                {selectedInvoice.patient.firstName} {selectedInvoice.patient.lastName}
              </div>
              <div className="flex justify-between text-slate-500 mt-1">
                <span>Invoice: {selectedInvoice.invoiceNumber}</span>
                <span className="font-bold text-red-600">Balance: {formatCurrency(selectedInvoice.balanceDue)}</span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (paymentForm.amount <= 0) return toast.error("Please enter a valid amount");
                recordPaymentMutation.mutate({
                  ...paymentForm,
                  invoiceId: selectedInvoice.id,
                  patientId: selectedInvoice.patient.id,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Payment Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoice.balanceDue}
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref # or Card Slip #"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  {recordPaymentMutation.isPending ? "Recording..." : "Confirm & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Printable Receipt View */}
      {isReceiptModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    D
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">DentalCare Pro</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">12, Rajpath Avenue, Koramangala, Bengaluru</p>
                <p className="text-xs text-slate-500">GSTIN: 29ABCDE1234F1ZX | Phone: 080-46001234</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md">
                  TAX INVOICE
                </span>
                <div className="text-sm font-bold text-slate-900 mt-2 font-mono">{selectedInvoice.invoiceNumber}</div>
                <div className="text-xs text-slate-500">{format(parseISO(selectedInvoice.invoiceDate), "MMMM d, yyyy")}</div>
              </div>
            </div>

            {/* Billed To */}
            <div className="p-4 bg-slate-50 rounded-xl grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-1">BILLED TO</span>
                <div className="font-bold text-slate-900 text-sm">
                  {selectedInvoice.patient.firstName} {selectedInvoice.patient.lastName}
                </div>
                <div className="text-slate-600 mt-0.5">Patient ID: {selectedInvoice.patient.patientId}</div>
                <div className="text-slate-600">Phone: {selectedInvoice.patient.phone}</div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-semibold block mb-1">STATUS</span>
                <span className="font-bold text-emerald-700 text-sm">{selectedInvoice.status.replace("_", " ")}</span>
                <div className="text-slate-600 mt-0.5">Total Paid: {formatCurrency(selectedInvoice.amountPaid)}</div>
                <div className="font-bold text-red-600">Balance: {formatCurrency(selectedInvoice.balanceDue)}</div>
              </div>
            </div>

            {/* Line items */}
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="p-3">Procedure / Service</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedInvoice.items?.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-medium text-slate-900">{it.description}</td>
                    <td className="p-3 text-center text-slate-600">{it.quantity}</td>
                    <td className="p-3 text-right text-slate-600">{formatCurrency(it.unitPrice)}</td>
                    <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(it.amount || it.quantity * it.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer Calculation */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax GST (18%):</span>
                  <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Print & Close */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Tax Receipt
              </button>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
