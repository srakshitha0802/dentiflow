export type Role = "ADMIN" | "DENTIST" | "RECEPTIONIST" | "ASSISTANT" | "ACCOUNTANT" | "INVENTORY_MANAGER";

// Permission definitions
export type Permission =
  // Patient permissions
  | "patients:read"
  | "patients:write"
  | "patients:delete"
  | "patients:medical:read"
  | "patients:medical:write"
  // Appointment permissions
  | "appointments:read"
  | "appointments:write"
  | "appointments:delete"
  // Clinical permissions
  | "clinical:read"
  | "clinical:write"
  // Treatment permissions
  | "treatments:read"
  | "treatments:write"
  // Billing permissions
  | "billing:read"
  | "billing:write"
  | "billing:delete"
  // Payment permissions
  | "payments:read"
  | "payments:write"
  // Inventory permissions
  | "inventory:read"
  | "inventory:write"
  | "inventory:delete"
  // Doctor permissions
  | "doctors:read"
  | "doctors:write"
  // User management
  | "users:read"
  | "users:write"
  | "users:delete"
  // Reports
  | "reports:read"
  // Audit logs
  | "audit:read"
  // Settings
  | "settings:read"
  | "settings:write"
  // Expenses
  | "expenses:read"
  | "expenses:write";

// Role-to-permissions mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    "patients:read",
    "patients:write",
    "patients:delete",
    "patients:medical:read",
    "patients:medical:write",
    "appointments:read",
    "appointments:write",
    "appointments:delete",
    "clinical:read",
    "clinical:write",
    "treatments:read",
    "treatments:write",
    "billing:read",
    "billing:write",
    "billing:delete",
    "payments:read",
    "payments:write",
    "inventory:read",
    "inventory:write",
    "inventory:delete",
    "doctors:read",
    "doctors:write",
    "users:read",
    "users:write",
    "users:delete",
    "reports:read",
    "audit:read",
    "settings:read",
    "settings:write",
    "expenses:read",
    "expenses:write",
  ],
  DENTIST: [
    "patients:read",
    "patients:write",
    "patients:medical:read",
    "patients:medical:write",
    "appointments:read",
    "appointments:write",
    "clinical:read",
    "clinical:write",
    "treatments:read",
    "billing:read",
    "payments:read",
    "doctors:read",
    "reports:read",
  ],
  RECEPTIONIST: [
    "patients:read",
    "patients:write",
    "appointments:read",
    "appointments:write",
    "billing:read",
    "billing:write",
    "payments:read",
    "payments:write",
    "treatments:read",
    "doctors:read",
  ],
  ASSISTANT: [
    "patients:read",
    "appointments:read",
    "appointments:write",
    "clinical:read",
    "treatments:read",
    "doctors:read",
  ],
  ACCOUNTANT: [
    "billing:read",
    "billing:write",
    "payments:read",
    "payments:write",
    "expenses:read",
    "expenses:write",
    "reports:read",
    "patients:read",
  ],
  INVENTORY_MANAGER: [
    "inventory:read",
    "inventory:write",
    "inventory:delete",
    "reports:read",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

// Role display names
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  DENTIST: "Dentist",
  RECEPTIONIST: "Receptionist",
  ASSISTANT: "Assistant",
  ACCOUNTANT: "Accountant",
  INVENTORY_MANAGER: "Inventory Manager",
};

// Role badge colors
export const ROLE_COLORS: Record<Role, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  DENTIST: "bg-blue-100 text-blue-700",
  RECEPTIONIST: "bg-emerald-100 text-emerald-700",
  ASSISTANT: "bg-teal-100 text-teal-700",
  ACCOUNTANT: "bg-amber-100 text-amber-700",
  INVENTORY_MANAGER: "bg-orange-100 text-orange-700",
};
