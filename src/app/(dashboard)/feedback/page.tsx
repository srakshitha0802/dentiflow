"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Star,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Trash2,
  MessageSquareHeart,
  TrendingUp,
  Smile,
  ShieldCheck,
  RefreshCw,
  Globe,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FeedbackItem {
  id: string;
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  rating: number;
  category: string;
  comment: string;
  treatment?: string;
  doctorId?: string;
  doctorName?: string;
  isPublic: boolean;
  createdAt: string;
  patient?: {
    id: string;
    patientId: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

export default function FeedbackDashboardPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  // Fetch feedback data
  const { data: responseData, isLoading, refetch } = useQuery({
    queryKey: ["dashboard-feedbacks", search, ratingFilter, categoryFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (ratingFilter) params.append("rating", ratingFilter);
      if (categoryFilter && categoryFilter !== "ALL") params.append("category", categoryFilter);
      params.append("page", String(page));
      params.append("limit", "12");

      const res = await fetch(`/api/feedback?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load feedbacks");
      return res.json();
    },
  });

  const feedbacks: FeedbackItem[] = responseData?.data || [];
  const pagination = responseData?.pagination || { total: 0, totalPages: 1 };
  const stats = responseData?.stats || {
    totalFeedbacks: 0,
    averageRating: 5.0,
    satisfactionRate: 100,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    publicCount: 0,
  };

  // Toggle Public Visibility Mutation
  const togglePublicMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const res = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isPublic }),
      });
      if (!res.ok) throw new Error("Failed to update visibility");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Feedback visibility updated.");
      queryClient.invalidateQueries({ queryKey: ["dashboard-feedbacks"] });
      queryClient.invalidateQueries({ queryKey: ["public-feedback"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Delete Feedback Mutation
  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/feedback?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete feedback");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Feedback deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["dashboard-feedbacks"] });
      queryClient.invalidateQueries({ queryKey: ["public-feedback"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            <span>Patient Feedback & Clinic Reviews</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor real-time patient ratings, comments, and manage verified testimonials shown on the landing page.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Reviews</span>
        </button>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Average Rating</span>
            <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <span>{stats.averageRating || "5.0"}</span>
              <div className="flex text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-amber-500 text-amber-500" />
                ))}
              </div>
            </div>
            <span className="text-[11px] text-teal-700 font-semibold mt-0.5 block">Out of 5.0 Stars</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
            <Star className="w-6 h-6 fill-amber-500" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Feedbacks</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {stats.totalFeedbacks}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Recorded from patients</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold">
            <MessageSquareHeart className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Satisfaction Rate</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {stats.satisfactionRate}%
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">4 & 5 Star Reviews</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
            <Smile className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Public Testimonials</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {stats.publicCount}
            </div>
            <span className="text-[11px] text-sky-600 font-semibold mt-0.5 block">Live on Landing Page</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center font-bold">
            <Globe className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by patient, comment, doctor, procedure..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars ★★★★★</option>
            <option value="4">4 Stars ★★★★☆</option>
            <option value="3">3 Stars ★★★☆☆</option>
            <option value="2">2 Stars ★★☆☆☆</option>
            <option value="1">1 Star ★☆☆☆☆</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="GENERAL">General Experience</option>
            <option value="DOCTOR">Doctor Care</option>
            <option value="TREATMENT">Treatment Quality</option>
            <option value="CLEANLINESS">Cleanliness & Hygiene</option>
            <option value="STAFF">Hospitality</option>
          </select>
        </div>
      </div>

      {/* FEEDBACK LIST CARDS / TABLE */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading patient feedbacks...
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <MessageSquareHeart className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No feedbacks found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Patients can submit feedback through their self-service patient portal. Submitted reviews will show up here automatically!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {feedbacks.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-850 font-bold flex items-center justify-center text-xs shrink-0">
                      {item.patientName?.charAt(0) || "P"}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        {item.patientName}
                      </span>
                      {item.patient?.patientId && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {item.patient.patientId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          "w-3.5 h-3.5",
                          s <= item.rating
                            ? "fill-amber-500 text-amber-500"
                            : "text-slate-200"
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                    {item.category?.replace(/_/g, " ")}
                  </span>

                  {item.treatment && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 truncate max-w-[150px]">
                      {item.treatment}
                    </span>
                  )}
                </div>

                {/* Comment */}
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                  &ldquo;{item.comment}&rdquo;
                </p>

                {item.doctorName && (
                  <div className="text-[11px] text-slate-500">
                    Doctor: <span className="font-semibold text-slate-800">{item.doctorName}</span>
                  </div>
                )}
              </div>

              {/* Footer Controls */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400">
                  {format(parseISO(item.createdAt), "MMM d, yyyy")}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      togglePublicMutation.mutate({
                        id: item.id,
                        isPublic: !item.isPublic,
                      })
                    }
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer",
                      item.isPublic
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                    )}
                    title="Toggle visibility on landing page"
                  >
                    <Globe className="w-3 h-3" />
                    <span>{item.isPublic ? "Public on Web" : "Hidden"}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this feedback?")) {
                        deleteFeedbackMutation.mutate(item.id);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                    title="Delete Feedback"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total reviews)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
