"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowUpDown,
  History,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  Layers,
  Truck
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  category?: { id: string; name: string };
  sku?: string;
  supplier?: { id: string; companyName: string };
  batchNumber?: string;
  purchasePrice: number;
  quantity: number;
  unit: string;
  minStockLevel: number;
  expiryDate?: string;
  status: string;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "new" || searchParams.get("new") === "true") {
      setIsAddModalOpen(true);
    }
  }, [searchParams]);

  // Fetch Inventory items
  const { data: responseData, isLoading } = useQuery({
    queryKey: ["inventory", searchQuery, statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("status", statusFilter);
      if (categoryFilter) params.append("categoryId", categoryFilter);
      params.append("limit", "50");

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
  });

  const items: InventoryItem[] = responseData?.data || [];

  // Fetch Categories & Suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Add Item State
  const [itemForm, setItemForm] = useState({
    name: "",
    categoryId: "",
    sku: "",
    supplierId: "",
    purchasePrice: 100,
    quantity: 10,
    unit: "piece",
    minStockLevel: 5,
    expiryDate: "",
    storageLocation: "",
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: typeof itemForm) => {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          sku: data.sku || undefined,
          supplierId: data.supplierId || undefined,
          purchasePrice: Number(data.purchasePrice),
          quantity: Number(data.quantity),
          unit: data.unit,
          minStockLevel: Number(data.minStockLevel),
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Inventory item added!");
      setIsAddModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Stock Movement Form
  const [movementForm, setMovementForm] = useState({
    type: "PURCHASE", // PURCHASE, CONSUMPTION, ADJUSTMENT, RETURN, DAMAGED
    quantity: 10,
    notes: "",
  });

  const stockMovementMutation = useMutation({
    mutationFn: async ({ itemId, ...data }: typeof movementForm & { itemId: string }) => {
      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          type: data.type,
          quantity: Number(data.quantity),
          notes: data.notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update stock");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Stock quantity adjusted successfully!");
      setIsMovementModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Stats calculation
  const totalItemsCount = items.length;
  const lowStockCount = items.filter((i) => i.status === "LOW_STOCK" || i.quantity <= i.minStockLevel).length;
  const outOfStockCount = items.filter((i) => i.status === "OUT_OF_STOCK" || i.quantity === 0).length;
  const totalValuation = items.reduce((sum, i) => sum + i.quantity * i.purchasePrice, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dental Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Track materials, instruments, stock levels, and supply consumption.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Catalog Items</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalItemsCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Warning
          </span>
          <div className="text-2xl font-bold text-amber-700 mt-1">{lowStockCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-red-600 font-semibold">Out of Stock</span>
          <div className="text-2xl font-bold text-red-700 mt-1">{outOfStockCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Stock Value</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalValuation)}</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search items by name, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { label: "All Items", value: "" },
            { label: "Low Stock", value: "LOW_STOCK" },
            { label: "In Stock", value: "IN_STOCK" },
            { label: "Out of Stock", value: "OUT_OF_STOCK" },
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

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading inventory items...</div>
        ) : items.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-800">No inventory items found</p>
            <p className="text-sm text-slate-400 mt-1">Add items to keep stock records updated.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition cursor-pointer"
            >
              Add New Item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4">Category / SKU</th>
                  <th className="px-6 py-4">Quantity</th>
                  <th className="px-6 py-4">Unit Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{item.itemId}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                      <div>{item.category?.name || "General Material"}</div>
                      {item.sku && <div className="text-slate-400 font-mono">{item.sku}</div>}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-base">{item.quantity}</span>
                        <span className="text-xs text-slate-500">{item.unit}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Min: {item.minStockLevel}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900">
                      {formatCurrency(item.purchasePrice)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                          item.quantity === 0 || item.status === "OUT_OF_STOCK"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : item.quantity <= item.minStockLevel || item.status === "LOW_STOCK"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}
                      >
                        {item.quantity === 0
                          ? "Out of Stock"
                          : item.quantity <= item.minStockLevel
                          ? "Low Stock"
                          : "In Stock"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setMovementForm({ type: "PURCHASE", quantity: 10, notes: "" });
                          setIsMovementModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 flex items-center gap-1 ml-auto transition cursor-pointer"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Add Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900">Add Inventory Item</h3>
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
                if (!itemForm.name) return toast.error("Please enter item name");
                createItemMutation.mutate(itemForm);
              }}
              className="space-y-4 pt-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Composite Resin A2 Shade"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">SKU / Code</label>
                  <input
                    type="text"
                    placeholder="COMP-A2"
                    value={itemForm.sku}
                    onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Unit</label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="piece">piece</option>
                    <option value="box">box</option>
                    <option value="pack">pack</option>
                    <option value="vial">vial</option>
                    <option value="syringe">syringe</option>
                    <option value="set">set</option>
                    <option value="pair">pair</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={itemForm.purchasePrice}
                    onChange={(e) => setItemForm({ ...itemForm, purchasePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Initial Qty</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Min Level</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={itemForm.minStockLevel}
                    onChange={(e) => setItemForm({ ...itemForm, minStockLevel: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
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
                  disabled={createItemMutation.isPending}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  {createItemMutation.isPending ? "Adding..." : "Add to Inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Stock Movement / Adjust */}
      {isMovementModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900">Adjust Stock</h3>
              </div>
              <button
                onClick={() => setIsMovementModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl my-4 text-xs">
              <div className="font-bold text-slate-900 text-sm">{selectedItem.name}</div>
              <div className="text-slate-500 mt-0.5">
                Current Stock: <span className="font-bold text-slate-900">{selectedItem.quantity} {selectedItem.unit}</span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                stockMovementMutation.mutate({
                  ...movementForm,
                  itemId: selectedItem.id,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Movement Type
                </label>
                <select
                  value={movementForm.type}
                  onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="PURCHASE">Restock / Purchase (Adds stock)</option>
                  <option value="CONSUMPTION">Clinic Consumption / Usage (Reduces stock)</option>
                  <option value="ADJUSTMENT">Stock Audit Adjustment</option>
                  <option value="DAMAGED">Damaged / Expired Removal (Reduces stock)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Quantity ({selectedItem.unit})
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Notes / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly clinic restocking"
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stockMovementMutation.isPending}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  {stockMovementMutation.isPending ? "Updating..." : "Save Stock Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
