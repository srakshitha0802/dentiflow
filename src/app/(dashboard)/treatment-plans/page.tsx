"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  PlayCircle,
  XCircle,
  X,
  Stethoscope,
  Trash2,
  ChevronRight,
  DollarSign,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

export default function TreatmentPlansPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-64 bg-slate-200 rounded-xl" />
          <div className="h-64 bg-white rounded-2xl border border-slate-200 p-6" />
        </div>
      }
    >
      <TreatmentPlansContent />
    </Suspense>
  );
}

interface TreatmentPlanItem {
  id?: string;
  treatmentId: string;
  treatment: {
    id: string;
    name: string;
    price: number;
  };
  toothNumber?: number;
  toothNumbers?: string;
  cost: number;
  estimatedCost?: number;
  status: string;
  notes?: string;
}

interface TreatmentPlan {
  id: string;
  planId: string;
  diagnosis: string;
  totalCost: number;
  estimatedCost?: number;
  status: string;
  priority: string;
  notes?: string;
  createdAt: string;
  patientId: string;
  patient: {
    id: string;
    patientId: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  doctorId: string;
  doctor: {
    user: {
      name: string;
      email: string;
    };
  };
  items: TreatmentPlanItem[];
}

const priorityStyles: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700 border-slate-200",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
  HIGH: "bg-amber-50 text-amber-700 border-amber-200",
  URGENT: "bg-red-50 text-red-700 border-red-200",
};

const statusStyles: Record<string, string> = {
  PROPOSED: "bg-slate-100 text-slate-700 border-slate-200",
  ACCEPTED: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

function TreatmentPlansContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "new" || searchParams.get("new") === "true") {
      setIsNewModalOpen(true);
    }
  }, [searchParams]);

  // Fetch Treatment Plans
  const { data: responseData, isLoading } = useQuery({
    queryKey: ["treatment-plans", statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);
      const res = await fetch(`/api/treatment-plans?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch treatment plans");
      return res.json();
    },
  });

  const plans: TreatmentPlan[] = responseData?.data || [];

  // Fetch Patients, Doctors, Treatments
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

  const { data: treatments = [] } = useQuery({
    queryKey: ["treatments-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/treatments");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Form state
  const [planForm, setPlanForm] = useState({
    patientId: searchParams.get("patientId") || "",
    doctorId: "",
    diagnosis: "Dental caries requiring multi-stage restorative therapy",
    priority: "MEDIUM",
    notes: "",
    items: [
      { treatmentId: "", toothNumbers: "#14, #15", sessions: 2, estimatedCost: 5000 },
    ],
  });

  const computedTotal = planForm.items.reduce((sum, it) => sum + Number(it.estimatedCost || 0), 0);

  const createPlanMutation = useMutation({
    mutationFn: async (data: typeof planForm) => {
      const res = await fetch("/api/treatment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: data.patientId,
          doctorId: data.doctorId,
          diagnosis: data.diagnosis,
          priority: data.priority,
          notes: data.notes || undefined,
          items: data.items.map((it) => ({
            treatmentId: it.treatmentId,
            toothNumbers: it.toothNumbers || undefined,
            sessions: Number(it.sessions),
            estimatedCost: Number(it.estimatedCost),
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create treatment plan");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatment-plans"] });
      toast.success("Treatment plan created successfully!");
      setIsNewModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Update Plan Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/treatment-plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update plan");
      }
      return res.json();
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ["treatment-plans"] });
      toast.success(`Plan updated to ${v.status.replace("_", " ")}`);
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Treatment Plans</h1>
          <p className="text-sm text-slate-500 mt-1">Multi-stage clinical procedures, tooth mapping, and staged estimates.</p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Treatment Plan
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search plans by patient or diagnosis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { label: "All Plans", value: "" },
            { label: "Proposed", value: "PROPOSED" },
            { label: "Accepted", value: "ACCEPTED" },
            { label: "In Progress", value: "IN_PROGRESS" },
            { label: "Completed", value: "COMPLETED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
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

      {/* Plans List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            Loading treatment plans...
          </div>
        ) : plans.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No treatment plans found</p>
            <p className="text-sm text-slate-400 mt-1">Create a plan to organize long-term dental restoration.</p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition cursor-pointer"
            >
              Create Treatment Plan
            </button>
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-400">#{plan.planId}</span>
                  <h3 className="font-bold text-slate-900 text-base">
                    {plan.patient.firstName} {plan.patient.lastName}
                  </h3>
                  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", priorityStyles[plan.priority])}>
                    {plan.priority} Priority
                  </span>
                  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", statusStyles[plan.status])}>
                    {plan.status.replace("_", " ")}
                  </span>
                </div>

                <div className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Diagnosis: </span>
                  {plan.diagnosis || "General restorative plan"}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 text-purple-600" />
                    Doctor: {plan.doctor.user.name}
                  </span>
                  <span>·</span>
                  <span>Items: {plan.items?.length || 0} procedures</span>
                  <span>·</span>
                  <span className="font-bold text-slate-900">Est. Total: {formatCurrency(plan.estimatedCost)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-end md:self-center">
                {plan.status === "PROPOSED" && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: plan.id, status: "ACCEPTED" })}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl border border-blue-200 transition cursor-pointer"
                  >
                    Accept Plan
                  </button>
                )}

                {plan.status === "ACCEPTED" && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: plan.id, status: "IN_PROGRESS" })}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Start Treatment
                  </button>
                )}

                {plan.status === "IN_PROGRESS" && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: plan.id, status: "COMPLETED" })}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Mark Completed
                  </button>
                )}

                <button
                  onClick={() => setSelectedPlan(plan)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: New Treatment Plan */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-slate-900">Create Treatment Plan</h3>
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
                if (!planForm.patientId || !planForm.doctorId) {
                  return toast.error("Please select patient and doctor");
                }
                createPlanMutation.mutate(planForm);
              }}
              className="space-y-4 pt-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Select Patient <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={planForm.patientId}
                    onChange={(e) => setPlanForm({ ...planForm, patientId: e.target.value })}
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
                    Doctor <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={planForm.doctorId}
                    onChange={(e) => setPlanForm({ ...planForm, doctorId: e.target.value })}
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

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Diagnosis</label>
                  <input
                    type="text"
                    required
                    value={planForm.diagnosis}
                    onChange={(e) => setPlanForm({ ...planForm, diagnosis: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Priority</label>
                  <select
                    value={planForm.priority}
                    onChange={(e) => setPlanForm({ ...planForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-slate-700">Planned Procedures</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPlanForm({
                        ...planForm,
                        items: [
                          ...planForm.items,
                          { treatmentId: "", toothNumbers: "", sessions: 1, estimatedCost: 2000 },
                        ],
                      })
                    }
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Procedure
                  </button>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {planForm.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/50 flex flex-wrap items-center gap-2 text-xs">
                      <select
                        required
                        value={item.treatmentId}
                        onChange={(e) => {
                          const trt = treatments.find((t: any) => t.id === e.target.value);
                          const updated = [...planForm.items];
                          updated[idx] = {
                            ...updated[idx],
                            treatmentId: e.target.value,
                            estimatedCost: trt ? trt.price : updated[idx].estimatedCost,
                          };
                          setPlanForm({ ...planForm, items: updated });
                        }}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white w-48"
                      >
                        <option value="">Select Treatment</option>
                        {treatments.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.name} (₹{t.price})
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Tooth # (e.g. 14, 15)"
                        value={item.toothNumbers}
                        onChange={(e) => {
                          const updated = [...planForm.items];
                          updated[idx].toothNumbers = e.target.value;
                          setPlanForm({ ...planForm, items: updated });
                        }}
                        className="w-28 px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />

                      <input
                        type="number"
                        min="1"
                        placeholder="Sessions"
                        value={item.sessions}
                        onChange={(e) => {
                          const updated = [...planForm.items];
                          updated[idx].sessions = Number(e.target.value);
                          setPlanForm({ ...planForm, items: updated });
                        }}
                        className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-center"
                      />

                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={item.estimatedCost}
                          onChange={(e) => {
                            const updated = [...planForm.items];
                            updated[idx].estimatedCost = Number(e.target.value);
                            setPlanForm({ ...planForm, items: updated });
                          }}
                          className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg bg-white font-bold"
                        />
                      </div>

                      {planForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPlanForm({
                              ...planForm,
                              items: planForm.items.filter((_, i) => i !== idx),
                            });
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl flex items-center justify-between text-sm font-bold text-purple-950">
                <span>Estimated Total Cost:</span>
                <span>{formatCurrency(computedTotal)}</span>
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
                  disabled={createPlanMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  {createPlanMutation.isPending ? "Saving..." : "Save Treatment Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Plan Details View */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-400 font-mono">#{selectedPlan.planId}</span>
                <h3 className="text-lg font-bold text-slate-900">Treatment Plan Overview</h3>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedPlan.patient.firstName} {selectedPlan.patient.lastName}
                  </div>
                  <div className="text-slate-500">Doctor: {selectedPlan.doctor.user.name}</div>
                </div>
                <span className={cn("px-2.5 py-1 rounded-full font-bold border", statusStyles[selectedPlan.status])}>
                  {selectedPlan.status.replace("_", " ")}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Diagnosis</span>
                <p className="p-2.5 bg-slate-50 rounded-lg text-slate-800">{selectedPlan.diagnosis || "N/A"}</p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Procedures</span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {selectedPlan.items?.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-slate-900">{it.treatment?.name || "Procedure"}</div>
                        {it.toothNumbers && <div className="text-slate-400">Teeth: {it.toothNumbers}</div>}
                      </div>
                      <div className="font-bold text-slate-900">{formatCurrency(it.estimatedCost)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center font-bold text-sm text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Estimated Cost:</span>
                <span className="text-purple-700">{formatCurrency(selectedPlan.estimatedCost)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedPlan(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs cursor-pointer"
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
