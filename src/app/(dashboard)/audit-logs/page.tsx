"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Receipt,
  Search,
  Filter,
  Shield,
  Clock,
  User,
  Activity,
  FileCode
} from "lucide-react";
import { formatRelativeTime, cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  previousData?: string;
  newData?: string;
  ipAddress?: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export default function AuditLogsPage() {
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["audit-logs", entityFilter, actionFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityFilter) params.append("entity", entityFilter);
      if (actionFilter) params.append("action", actionFilter);
      params.append("page", String(page));
      params.append("limit", "25");

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const logs: AuditLog[] = responseData?.data || [];
  const pagination = responseData?.pagination || { total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-1">Immutable system audit trail of sensitive patient modifications, bookings, and financial actions.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action keyword..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { label: "All Entities", value: "" },
            { label: "Patient", value: "Patient" },
            { label: "Appointment", value: "Appointment" },
            { label: "Invoice", value: "Invoice" },
            { label: "Payment", value: "Payment" },
            { label: "Inventory", value: "InventoryItem" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setEntityFilter(tab.value);
                setPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer",
                entityFilter === tab.value
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No activity logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Entity</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Changes</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-800 font-mono text-xs font-bold rounded-lg border border-blue-200">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-900">
                      {log.entity}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-900 font-bold text-xs">{log.user?.name || "System"}</div>
                      <div className="text-[11px] text-slate-400">{log.user?.role || "SYSTEM"}</div>
                    </td>

                    <td className="px-6 py-4 text-xs font-mono text-slate-600 max-w-xs truncate">
                      {log.newData ? JSON.stringify(log.newData) : "—"}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      <div>{format(parseISO(log.createdAt), "MMM d, yyyy · HH:mm")}</div>
                      <div className="text-[10px] text-slate-400">{formatRelativeTime(log.createdAt)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
