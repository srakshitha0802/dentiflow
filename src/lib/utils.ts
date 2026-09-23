import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Number Formatting ───────────────────────────────────────
export function formatCurrency(
  amount?: number | null,
  currency: string = "INR",
  locale: string = "en-IN"
): string {
  const safeAmount = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

// ─── Date Formatting ─────────────────────────────────────────
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy, hh:mm a");
}

export function formatTime(time: string): string {
  if (!time) return "—";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDateLabel(date: Date | string): string {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, dd MMM yyyy");
}

// ─── Age Calculation ─────────────────────────────────────────
export function calculateAge(dateOfBirth: Date | string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// ─── ID Generation ───────────────────────────────────────────
export function generatePatientId(count: number): string {
  return `PAT-${String(count + 1).padStart(5, "0")}`;
}

export function generateAppointmentId(count: number): string {
  return `APT-${String(count + 1).padStart(5, "0")}`;
}

export function generateInvoiceNumber(count: number, prefix: string = "INV"): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(5, "0")}`;
}

export function generatePaymentId(count: number): string {
  return `PAY-${String(count + 1).padStart(5, "0")}`;
}

export function generateTreatmentId(count: number): string {
  return `TRT-${String(count + 1).padStart(3, "0")}`;
}

export function generateSupplierId(count: number): string {
  return `SUP-${String(count + 1).padStart(4, "0")}`;
}

export function generateInventoryId(count: number): string {
  return `INV-${String(count + 1).padStart(4, "0")}`;
}

export function generateExpenseId(count: number): string {
  return `EXP-${String(count + 1).padStart(5, "0")}`;
}

export function generatePrescriptionId(count: number): string {
  return `RX-${String(count + 1).padStart(5, "0")}`;
}

export function generatePlanId(count: number): string {
  return `TP-${String(count + 1).padStart(4, "0")}`;
}

export function generatePOId(count: number): string {
  return `PO-${String(count + 1).padStart(5, "0")}`;
}

export function generateUserId(count: number): string {
  return `USR-${String(count + 1).padStart(4, "0")}`;
}

export function generateClinicalNoteId(count: number): string {
  return `NOTE-${String(count + 1).padStart(5, "0")}`;
}

// ─── String Utilities ────────────────────────────────────────
export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "-");
}

// ─── Pagination ──────────────────────────────────────────────
export interface PaginationParams {
  page: number;
  limit: number;
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  return { page, limit };
}

export function getPaginationSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

// ─── API Response Helpers ────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function apiSuccess<T>(data: T, message?: string): ApiResponse<T> {
  return { data, message };
}

export function apiError(error: string): ApiResponse {
  return { error };
}

// ─── Status Colors ───────────────────────────────────────────
export const appointmentStatusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  CHECKED_IN: "bg-purple-100 text-purple-700",
  IN_TREATMENT: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-gray-100 text-gray-600",
};

export const invoiceStatusColors: Record<string, string> = {
  UNPAID: "bg-red-100 text-red-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  REFUNDED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export const inventoryStatusColors: Record<string, string> = {
  IN_STOCK: "bg-green-100 text-green-700",
  LOW_STOCK: "bg-amber-100 text-amber-700",
  OUT_OF_STOCK: "bg-red-100 text-red-700",
  EXPIRED: "bg-red-100 text-red-700",
};

export const treatmentPlanStatusColors: Record<string, string> = {
  PROPOSED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

// ─── Debounce ────────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── File Utilities ──────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ALLOWED_DOCUMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "image/dicom",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
