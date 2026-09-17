"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Pill,
  Plus,
  Search,
  Printer,
  X,
  Stethoscope,
  Trash2,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { calculateAge, cn } from "@/lib/utils";

interface PrescriptionItem {
  id?: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface Prescription {
  id: string;
  prescriptionId: string;
  date: string;
  notes?: string;
  patient: {
    id: string;
    patientId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
  };
  doctor: {
    qualification: string;
    specialization: string;
    registrationNumber: string;
    user: {
      name: string;
    };
  };
  items: PrescriptionItem[];
}

export default function PrescriptionsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "new" || searchParams.get("new") === "true") {
      setIsNewModalOpen(true);
    }
  }, [searchParams]);

  // Fetch Prescriptions
  const { data: responseData, isLoading } = useQuery({
    queryKey: ["prescriptions", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      const res = await fetch(`/api/prescriptions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch prescriptions");
      return res.json();
    },
  });

  const prescriptions: Prescription[] = responseData?.data || [];

  // Fetch Patients and Doctors for dropdown
  const { data: patients = [] } = useQuery({
    queryKey: ["patients-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/patients?limit=100");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/doctors");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Form State
  const [rxForm, setRxForm] = useState({
    patientId: searchParams.get("patientId") || "",
    doctorId: "",
    notes: "Take medications strictly after meals.",
    items: [
      { medication: "Amoxicillin 500mg", dosage: "1 Tablet", frequency: "1-0-1 (Twice Daily)", duration: "5 Days", instructions: "After meals" },
      { medication: "Ibuprofen 400mg", dosage: "1 Tablet", frequency: "1-0-1 (As needed for pain)", duration: "3 Days", instructions: "After food" },
    ],
  });

  const createRxMutation = useMutation({
    mutationFn: async (data: typeof rxForm) => {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create prescription");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast.success("Prescription generated successfully!");
      setIsNewModalOpen(false);
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Prescriptions (Rx)</h1>
          <p className="text-sm text-slate-500 mt-1">Generate dental prescriptions, dosage instructions, and printable medical slips.</p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Prescription
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search prescriptions by patient or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading prescriptions...</div>
        ) : prescriptions.length === 0 ? (
          <div className="py-16 text-center">
            <Pill className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No prescriptions recorded</p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition cursor-pointer"
            >
              Issue New Prescription
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {prescriptions.map((rx) => (
              <div
                key={rx.id}
                className="p-5 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-400">#{rx.prescriptionId}</span>
                    <h3 className="font-bold text-slate-900 text-base">
                      {rx.patient.firstName} {rx.patient.lastName}
                    </h3>
                    <span className="text-xs text-slate-400">({rx.patient.phone})</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-amber-600" />
                      Prescribed by {rx.doctor.user.name}
                    </span>
                    <span>·</span>
                    <span>{format(parseISO(rx.date), "MMM d, yyyy")}</span>
                  </div>

                  {/* Medicines preview */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {rx.items?.map((it, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-md text-xs font-medium"
                      >
                        {it.medication} ({it.frequency})
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedRx(rx)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-end md:self-center"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Slip
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: New Prescription */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900">Issue Dental Prescription</h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!rxForm.patientId || !rxForm.doctorId) {
                  return toast.error("Please select patient and doctor");
                }
                createRxMutation.mutate(rxForm);
              }}
              className="space-y-4 pt-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Patient <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={rxForm.patientId}
                    onChange={(e) => setRxForm({ ...rxForm, patientId: e.target.value })}
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Prescribing Doctor <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={rxForm.doctorId}
                    onChange={(e) => setRxForm({ ...rxForm, doctorId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">-- Choose Doctor --</option>
                    {doctors.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.user.name} ({d.specialization})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Medication Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-slate-700">Medications</span>
                  <button
                    type="button"
                    onClick={() =>
                      setRxForm({
                        ...rxForm,
                        items: [
                          ...rxForm.items,
                          { medication: "Paracetamol 650mg", dosage: "1 Tab", frequency: "1-0-1", duration: "3 Days", instructions: "After meals" },
                        ],
                      })
                    }
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Medicine
                  </button>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {rxForm.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <input
                        type="text"
                        required
                        placeholder="Drug / Medicine Name"
                        value={item.medication}
                        onChange={(e) => {
                          const updated = [...rxForm.items];
                          updated[idx].medication = e.target.value;
                          setRxForm({ ...rxForm, items: updated });
                        }}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white sm:col-span-2 font-medium"
                      />
                      <input
                        type="text"
                        placeholder="Frequency (e.g. 1-0-1)"
                        value={item.frequency}
                        onChange={(e) => {
                          const updated = [...rxForm.items];
                          updated[idx].frequency = e.target.value;
                          setRxForm({ ...rxForm, items: updated });
                        }}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Duration (5 Days)"
                          value={item.duration}
                          onChange={(e) => {
                            const updated = [...rxForm.items];
                            updated[idx].duration = e.target.value;
                            setRxForm({ ...rxForm, items: updated });
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                        />
                        {rxForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setRxForm({
                                ...rxForm,
                                items: rxForm.items.filter((_, i) => i !== idx),
                              });
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Doctor Advice / Remarks</label>
                <textarea
                  rows={2}
                  value={rxForm.notes}
                  onChange={(e) => setRxForm({ ...rxForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRxMutation.isPending}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  {createRxMutation.isPending ? "Generating..." : "Generate Prescription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Printable Rx Slip */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-2xl border border-slate-200 space-y-6">
            {/* Header Letterhead */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    D
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">DentalCare Pro</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">12, Rajpath Avenue, Koramangala, Bengaluru</p>
                <p className="text-xs text-slate-500">Phone: 080-46001234</p>
              </div>
              <div className="text-right text-xs">
                <div className="font-bold text-slate-900 text-sm">{selectedRx.doctor.user.name}</div>
                <div className="text-slate-500">{selectedRx.doctor.qualification}</div>
                <div className="text-slate-500">Reg: {selectedRx.doctor.registrationNumber}</div>
              </div>
            </div>

            {/* Patient Info */}
            <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block">Patient</span>
                <span className="font-bold text-slate-900">{selectedRx.patient.firstName} {selectedRx.patient.lastName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Age / Gender</span>
                <span className="font-medium text-slate-800">{calculateAge(new Date(selectedRx.patient.dateOfBirth))} yrs, {selectedRx.patient.gender}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Date</span>
                <span className="font-bold text-slate-800">{format(parseISO(selectedRx.date), "MMM d, yyyy")}</span>
              </div>
            </div>

            {/* Rx Symbol & Medication list */}
            <div>
              <div className="text-2xl font-serif font-black text-slate-900 mb-3">℞</div>
              <div className="divide-y divide-slate-200">
                {selectedRx.items?.map((it, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{idx + 1}. {it.medication}</div>
                      <div className="text-slate-500 mt-0.5">{it.dosage} · {it.instructions || "After meals"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{it.frequency}</div>
                      <div className="text-slate-400 mt-0.5">{it.duration}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedRx.notes && (
              <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 border border-amber-200">
                <span className="font-bold block mb-0.5">Doctor Advice:</span>
                {selectedRx.notes}
              </div>
            )}

            {/* Signature Area */}
            <div className="flex justify-between items-end pt-8 border-t border-slate-200 text-xs">
              <div className="text-slate-400">Generated via DentalCare Pro EMR</div>
              <div className="text-center">
                <div className="w-32 border-b border-slate-300 pb-1 mb-1 font-signature text-slate-700">
                  {selectedRx.doctor.user.name}
                </div>
                <div className="font-bold text-slate-600">Authorized Signature</div>
              </div>
            </div>

            {/* Print & Close */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Prescription
              </button>
              <button
                onClick={() => setSelectedRx(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
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
