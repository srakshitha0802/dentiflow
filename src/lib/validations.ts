import { z } from "zod";

// ─── Auth Schemas ─────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// ─── Patient Schemas ──────────────────────────────────────────
export const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  bloodGroup: z.string().optional(),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number too long")
    .regex(/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z
    .string()
    .regex(/^\d{6}$/, "PIN code must be 6 digits")
    .optional()
    .or(z.literal("")),
  country: z.string().default("India"),
  // Emergency contact
  emergencyName: z.string().optional(),
  emergencyRelationship: z.string().optional(),
  emergencyPhone: z.string().optional(),
  // Medical history
  allergies: z.string().optional(),
  conditions: z.string().optional(),
  medications: z.string().optional(),
  surgeries: z.string().optional(),
  diabetes: z.boolean().default(false),
  hypertension: z.boolean().default(false),
  isPregnant: z.boolean().default(false),
  medicalNotes: z.string().optional(),
  // Dental info
  previousTreatments: z.string().optional(),
  dentalConcerns: z.string().optional(),
  oralHygieneNotes: z.string().optional(),
  smokingStatus: z
    .enum(["NON_SMOKER", "SMOKER", "FORMER_SMOKER", "OCCASIONAL"])
    .default("NON_SMOKER"),
  previousDentist: z.string().optional(),
  treatmentConsent: z.boolean().default(false),
  privacyConsent: z.boolean().default(false),
});

// ─── Appointment Schemas ──────────────────────────────────────
export const appointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  roomId: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  treatmentIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  status: z
    .enum([
      "SCHEDULED",
      "CONFIRMED",
      "CHECKED_IN",
      "IN_TREATMENT",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ])
    .default("SCHEDULED"),
});

// ─── Treatment Schemas ────────────────────────────────────────
export const treatmentSchema = z.object({
  name: z.string().min(1, "Treatment name is required"),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().int().min(5, "Duration must be at least 5 minutes"),
  price: z.number().min(0, "Price must be positive"),
  taxPercent: z.number().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
});

// ─── Clinical Note Schemas ────────────────────────────────────
export const clinicalNoteSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  appointmentId: z.string().optional(),
  chiefComplaint: z.string().optional(),
  examination: z.string().optional(),
  diagnosis: z.string().optional(),
  treatmentDone: z.string().optional(),
  recommendations: z.string().optional(),
  followUpDate: z.string().optional(),
});

// ─── Treatment Plan Schemas ───────────────────────────────────
export const treatmentPlanSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  expectedCompletion: z.string().optional(),
  status: z
    .enum(["PROPOSED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .default("PROPOSED"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  items: z
    .array(
      z.object({
        treatmentId: z.string().min(1, "Treatment is required"),
        toothNumbers: z.string().optional(),
        sessions: z.number().int().min(1).default(1),
        estimatedCost: z.number().min(0),
        notes: z.string().optional(),
      })
    )
    .min(1, "At least one treatment item is required"),
});

// ─── Prescription Schemas ─────────────────────────────────────
export const prescriptionSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        medication: z.string().min(1, "Medication name is required"),
        dosage: z.string().min(1, "Dosage is required"),
        frequency: z.string().min(1, "Frequency is required"),
        duration: z.string().min(1, "Duration is required"),
        instructions: z.string().optional(),
      })
    )
    .min(1, "At least one medication is required"),
});

// ─── Invoice Schemas ──────────────────────────────────────────
export const invoiceSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().optional(),
  appointmentId: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  discountType: z.enum(["NONE", "PERCENTAGE", "FIXED"]).default("NONE"),
  discountValue: z.number().min(0).default(0),
  taxPercent: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        treatmentId: z.string().optional(),
        description: z.string().min(1, "Description is required"),
        quantity: z.number().int().min(1).default(1),
        unitPrice: z.number().min(0),
        discount: z.number().min(0).default(0),
        tax: z.number().min(0).default(0),
      })
    )
    .min(1, "At least one item is required"),
});

// ─── Payment Schemas ──────────────────────────────────────────
export const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  method: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER", "OTHER"]),
  referenceNumber: z.string().optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Inventory Schemas ────────────────────────────────────────
export const inventoryItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  categoryId: z.string().optional(),
  sku: z.string().optional(),
  supplierId: z.string().optional(),
  batchNumber: z.string().optional(),
  purchasePrice: z.number().min(0, "Purchase price must be positive"),
  sellingPrice: z.number().min(0).optional(),
  quantity: z.number().int().min(0).default(0),
  unit: z.string().default("piece"),
  minStockLevel: z.number().int().min(0).default(10),
  expiryDate: z.string().optional(),
  storageLocation: z.string().optional(),
});

// ─── Stock Movement Schemas ───────────────────────────────────
export const stockMovementSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  type: z.enum(["PURCHASE", "CONSUMPTION", "ADJUSTMENT", "RETURN", "EXPIRY", "DAMAGED"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Supplier Schemas ─────────────────────────────────────────
export const supplierSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// ─── Expense Schemas ──────────────────────────────────────────
export const expenseSchema = z.object({
  category: z.enum([
    "RENT",
    "UTILITIES",
    "SALARIES",
    "EQUIPMENT",
    "SUPPLIES",
    "MAINTENANCE",
    "MARKETING",
    "OTHER",
  ]),
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  method: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER", "OTHER"]),
  vendor: z.string().optional(),
  notes: z.string().optional(),
});

// ─── User Schemas ─────────────────────────────────────────────
export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
  role: z.enum([
    "ADMIN",
    "DENTIST",
    "RECEPTIONIST",
    "ASSISTANT",
    "ACCOUNTANT",
    "INVENTORY_MANAGER",
  ]),
  phone: z.string().optional(),
});

export const updateUserSchema = userSchema.partial().omit({ password: true });

// ─── Doctor Schemas ───────────────────────────────────────────
export const doctorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
  phone: z.string().optional(),
  qualification: z.string().min(1, "Qualification is required"),
  specialization: z.string().min(1, "Specialization is required"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  bio: z.string().optional(),
});

// ─── Settings Schemas ─────────────────────────────────────────
export const clinicSettingsSchema = z.object({
  clinicName: z.string().min(1, "Clinic name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  gstin: z.string().optional(),
  currency: z.string().default("INR"),
  timezone: z.string().default("Asia/Kolkata"),
  invoicePrefix: z.string().default("INV"),
  taxPercent: z.string().optional(),
});

// ─── Dental Chart Schemas ─────────────────────────────────────
export const dentalChartEntrySchema = z.object({
  toothNumber: z.number().int().min(1).max(52),
  toothType: z.enum(["ADULT", "PRIMARY"]).default("ADULT"),
  condition: z.enum([
    "HEALTHY",
    "CARIES",
    "FILLED",
    "MISSING",
    "CROWN",
    "ROOT_CANAL",
    "EXTRACTION_PLANNED",
    "EXTRACTION_COMPLETED",
    "IMPLANT",
    "BRIDGE",
    "WATCH",
    "OTHER",
  ]),
  notes: z.string().optional(),
});
