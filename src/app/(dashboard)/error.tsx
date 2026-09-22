"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route error:", error);
  }, [error]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4 max-w-lg mx-auto mt-8">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-900">Failed to load dashboard data</h2>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          {error?.message || "There was a problem loading this section. Please try refreshing or checking your network connection."}
        </p>
      </div>
      <div className="pt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry Loading</span>
        </button>
      </div>
    </div>
  );
}
