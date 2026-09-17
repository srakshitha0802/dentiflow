"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Plus,
  Search,
  Clock,
  Tag,
  DollarSign,
  Edit2,
  Trash2,
  X,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";

interface Treatment {
  id: string;
  treatmentId: string;
  name: string;
  category?: { id: string; name: string };
  description?: string;
  duration: number;
  price: number;
  taxPercent: number;
  isActive: boolean;
}

export default function TreatmentsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch Treatments
  const { data: treatments = [], isLoading } = useQuery<Treatment[]>({
    queryKey: ["treatments", selectedCategory, searchQuery],
    queryFn: async () => {
      const res = await fetch("/api/treatments");
      if (!res.ok) throw new Error("Failed to fetch treatments");
      const json = await res.json();
      return json.data || [];
    },
  });

  const categories = Array.from(new Set(treatments.map((t) => t.category?.name).filter(Boolean))) as string[];

  const filteredTreatments = treatments.filter((t) => {
    if (selectedCategory && t.category?.name !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q) || t.treatmentId.toLowerCase().includes(q);
    }
    return true;
  });

  // Add Treatment Form State
  const [treatmentForm, setTreatmentForm] = useState({
    name: "",
    categoryName: "Restorative",
    description: "",
    duration: 30,
    price: 1500,
    taxPercent: 18,
  });

  const createTreatmentMutation = useMutation({
    mutationFn: async (data: typeof treatmentForm) => {
      const res = await fetch("/api/treatments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          categoryName: data.categoryName,
          description: data.description || undefined,
          duration: Number(data.duration),
          price: Number(data.price),
          taxPercent: Number(data.taxPercent),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create treatment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
      queryClient.invalidateQueries({ queryKey: ["treatments-list"] });
      toast.success("Treatment added to clinical catalog!");
      setIsAddModalOpen(false);
      setTreatmentForm({
        name: "",
        categoryName: "Restorative",
        description: "",
        duration: 30,
        price: 1500,
        taxPercent: 18,
      });
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dental Procedures & Treatments</h1>
          <p className="text-sm text-slate-500 mt-1">Configure treatment catalog, standard pricing, durations, and tax brackets.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Treatment
        </button>
      </div>

      {/* Filter / Category Tabs Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search procedures by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-slate-100 pt-3">
          <button
            onClick={() => setSelectedCategory("")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer",
              selectedCategory === ""
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            All Categories ({treatments.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer",
                selectedCategory === cat
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Treatments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading treatments catalog...</div>
        ) : filteredTreatments.length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No treatments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Treatment Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Standard Price</th>
                  <th className="px-6 py-4">Tax (GST)</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTreatments.map((trt) => (
                  <tr key={trt.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{trt.name}</div>
                      {trt.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{trt.description}</div>}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                        {trt.category?.name || "General"}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{trt.duration} mins</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                      {formatCurrency(trt.price)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      {trt.taxPercent}%
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => toast.success(`Updated ${trt.name} settings.`)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Add Treatment */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Add Dental Procedure</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!treatmentForm.name) return toast.error("Please enter treatment name");
                createTreatmentMutation.mutate(treatmentForm);
              }}
              className="space-y-4 pt-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Procedure Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ultrasonic Scaling & Polishing"
                  value={treatmentForm.name}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Category</label>
                  <select
                    value={treatmentForm.categoryName}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, categoryName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Diagnostic">Diagnostic</option>
                    <option value="Preventive">Preventive</option>
                    <option value="Restorative">Restorative</option>
                    <option value="Surgical">Surgical</option>
                    <option value="Cosmetic">Cosmetic</option>
                    <option value="Orthodontic">Orthodontic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    required
                    value={treatmentForm.duration}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, duration: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Standard Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={treatmentForm.price}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tax GST (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="28"
                    value={treatmentForm.taxPercent}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, taxPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Description / Clinical Notes</label>
                <textarea
                  rows={2}
                  placeholder="Clinical details..."
                  value={treatmentForm.description}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTreatmentMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  {createTreatmentMutation.isPending ? "Adding..." : "Save Treatment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
