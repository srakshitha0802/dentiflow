import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const Role = {
  ADMIN: "ADMIN",
  DENTIST: "DENTIST",
  RECEPTIONIST: "RECEPTIONIST",
  ASSISTANT: "ASSISTANT",
  ACCOUNTANT: "ACCOUNTANT",
  INVENTORY_MANAGER: "INVENTORY_MANAGER",
} as const;

const Gender = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
} as const;

const PatientStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;

const AppointmentStatus = {
  SCHEDULED: "SCHEDULED",
  CONFIRMED: "CONFIRMED",
  CHECKED_IN: "CHECKED_IN",
  IN_TREATMENT: "IN_TREATMENT",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
} as const;

type AppointmentStatusType = keyof typeof AppointmentStatus;

const InvoiceStatus = {
  UNPAID: "UNPAID",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
} as const;

type InvoiceStatusType = keyof typeof InvoiceStatus;

const InventoryStatus = {
  IN_STOCK: "IN_STOCK",
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  EXPIRED: "EXPIRED",
} as const;

type InventoryStatusType = keyof typeof InventoryStatus;

const TreatmentPlanStatus = {
  PROPOSED: "PROPOSED",
  ACCEPTED: "ACCEPTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

const PlanPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;

const ExpenseCategory = {
  RENT: "RENT",
  UTILITIES: "UTILITIES",
  SALARIES: "SALARIES",
  EQUIPMENT: "EQUIPMENT",
  SUPPLIES: "SUPPLIES",
  MAINTENANCE: "MAINTENANCE",
  MARKETING: "MARKETING",
  OTHER: "OTHER",
} as const;

const PaymentMethod = {
  CASH: "CASH",
  CARD: "CARD",
  UPI: "UPI",
  BANK_TRANSFER: "BANK_TRANSFER",
  OTHER: "OTHER",
} as const;

const MovementType = {
  PURCHASE: "PURCHASE",
  CONSUMPTION: "CONSUMPTION",
  ADJUSTMENT: "ADJUSTMENT",
  RETURN: "RETURN",
  EXPIRY: "EXPIRY",
  DAMAGED: "DAMAGED",
} as const;

const SupplierStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

const SmokingStatus = {
  NON_SMOKER: "NON_SMOKER",
  SMOKER: "SMOKER",
  FORMER_SMOKER: "FORMER_SMOKER",
  OCCASIONAL: "OCCASIONAL",
} as const;

const ToothCondition = {
  HEALTHY: "HEALTHY",
  CARIES: "CARIES",
  FILLED: "FILLED",
  MISSING: "MISSING",
  CROWN: "CROWN",
  ROOT_CANAL: "ROOT_CANAL",
  EXTRACTION_PLANNED: "EXTRACTION_PLANNED",
  EXTRACTION_COMPLETED: "EXTRACTION_COMPLETED",
  IMPLANT: "IMPLANT",
  BRIDGE: "BRIDGE",
  WATCH: "WATCH",
  OTHER: "OTHER",
} as const;

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ─── Clinic Settings ─────────────────────────────────────────
  const settings = [
    { key: "clinicName", value: "DentalCare Pro" },
    { key: "address", value: "12, Rajpath Avenue, Koramangala" },
    { key: "city", value: "Bengaluru" },
    { key: "state", value: "Karnataka" },
    { key: "phone", value: "080-46001234" },
    { key: "email", value: "info@dentalcarepro.in" },
    { key: "website", value: "https://dentalcarepro.in" },
    { key: "gstin", value: "29ABCDE1234F1ZX" },
    { key: "currency", value: "INR" },
    { key: "timezone", value: "Asia/Kolkata" },
    { key: "invoicePrefix", value: "INV" },
    { key: "taxPercent", value: "18" },
    { key: "appointmentDuration", value: "30" },
    { key: "workingHoursStart", value: "09:00" },
    { key: "workingHoursEnd", value: "19:00" },
  ];

  for (const setting of settings) {
    await prisma.clinicSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log("✓ Clinic settings seeded");

  // ─── Users & Doctors ─────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("Admin@123", 10);
  const dentistPass = await bcrypt.hash("Dentist@123", 10);
  const receptionPass = await bcrypt.hash("Recept@123", 10);
  const accountPass = await bcrypt.hash("Account@123", 10);
  const inventoryPass = await bcrypt.hash("Invent@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@dentalcare.com" },
    update: {},
    create: {
      email: "admin@dentalcare.com",
      name: "Admin User",
      password: hashedPassword,
      role: Role.ADMIN,
      phone: "9876543210",
    },
  });

  const dentist1User = await prisma.user.upsert({
    where: { email: "dentist@dentalcare.com" },
    update: {},
    create: {
      email: "dentist@dentalcare.com",
      name: "Dr. Ananya Rao",
      password: dentistPass,
      role: Role.DENTIST,
      phone: "9876543211",
    },
  });

  const dentist2User = await prisma.user.upsert({
    where: { email: "dentist2@dentalcare.com" },
    update: {},
    create: {
      email: "dentist2@dentalcare.com",
      name: "Dr. Arjun Mehta",
      password: dentistPass,
      role: Role.DENTIST,
      phone: "9876543212",
    },
  });

  const dentist3User = await prisma.user.upsert({
    where: { email: "dentist3@dentalcare.com" },
    update: {},
    create: {
      email: "dentist3@dentalcare.com",
      name: "Dr. Priya Krishnan",
      password: dentistPass,
      role: Role.DENTIST,
      phone: "9876543213",
    },
  });

  await prisma.user.upsert({
    where: { email: "reception@dentalcare.com" },
    update: {},
    create: {
      email: "reception@dentalcare.com",
      name: "Meena Sharma",
      password: receptionPass,
      role: Role.RECEPTIONIST,
      phone: "9876543214",
    },
  });

  await prisma.user.upsert({
    where: { email: "accountant@dentalcare.com" },
    update: {},
    create: {
      email: "accountant@dentalcare.com",
      name: "Rajesh Kumar",
      password: accountPass,
      role: Role.ACCOUNTANT,
      phone: "9876543215",
    },
  });

  await prisma.user.upsert({
    where: { email: "inventory@dentalcare.com" },
    update: {},
    create: {
      email: "inventory@dentalcare.com",
      name: "Sunita Patel",
      password: inventoryPass,
      role: Role.INVENTORY_MANAGER,
      phone: "9876543216",
    },
  });

  await prisma.user.upsert({
    where: { email: "assistant@dentalcare.com" },
    update: {},
    create: {
      email: "assistant@dentalcare.com",
      name: "Ravi Shankar",
      password: receptionPass,
      role: Role.ASSISTANT,
      phone: "9876543217",
    },
  });

  // Doctors
  const doctor1 = await prisma.doctor.upsert({
    where: { userId: dentist1User.id },
    update: {},
    create: {
      userId: dentist1User.id,
      qualification: "BDS, MDS (Oral Surgery)",
      specialization: "Oral Surgery & Implantology",
      registrationNumber: "KAR-DEN-12345",
      bio: "Dr. Ananya Rao has over 10 years of experience in oral surgery and implantology.",
    },
  });

  const doctor2 = await prisma.doctor.upsert({
    where: { userId: dentist2User.id },
    update: {},
    create: {
      userId: dentist2User.id,
      qualification: "BDS, MDS (Orthodontics)",
      specialization: "Orthodontics & Pediatric Dentistry",
      registrationNumber: "KAR-DEN-23456",
      bio: "Dr. Arjun Mehta specializes in orthodontics and pediatric dental care.",
    },
  });

  const doctor3 = await prisma.doctor.upsert({
    where: { userId: dentist3User.id },
    update: {},
    create: {
      userId: dentist3User.id,
      qualification: "BDS, MDS (Endodontics)",
      specialization: "Endodontics & Restorative Dentistry",
      registrationNumber: "KAR-DEN-34567",
      bio: "Dr. Priya Krishnan is an expert in root canal therapy and restorative procedures.",
    },
  });

  // Doctor schedules
  for (const doctor of [doctor1, doctor2, doctor3]) {
    for (let day = 1; day <= 6; day++) {
      const existing = await prisma.doctorSchedule.findFirst({
        where: { doctorId: doctor.id, dayOfWeek: day },
      });
      if (!existing) {
        await prisma.doctorSchedule.create({
          data: {
            doctorId: doctor.id,
            dayOfWeek: day,
            startTime: "09:00",
            endTime: "18:00",
          },
        });
      }
    }
  }
  console.log("✓ Users and doctors seeded");

  // ─── Rooms ───────────────────────────────────────────────────
  const rooms = [
    { name: "Treatment Room 1", description: "General dentistry" },
    { name: "Treatment Room 2", description: "Orthodontics" },
    { name: "Surgery Room", description: "Oral surgery & implants" },
    { name: "X-Ray Room", description: "Radiography" },
  ];
  const createdRooms: { id: string }[] = [];
  for (const room of rooms) {
    const r = await prisma.room.upsert({
      where: { id: room.name },
      update: {},
      create: room,
    }).catch(async () => {
      const existing = await prisma.room.findFirst({ where: { name: room.name } });
      return existing!;
    });
    createdRooms.push(r);
  }
  console.log("✓ Rooms seeded");

  // ─── Treatment Categories & Treatments ───────────────────────
  const categories: Record<string, { id: string }> = {};
  for (const cat of ["Consultation", "Preventive", "Restorative", "Surgical", "Cosmetic", "Orthodontic", "Diagnostic"]) {
    const c = await prisma.treatmentCategory.upsert({
      where: { name: cat },
      update: {},
      create: { name: cat },
    });
    categories[cat] = c;
  }

  const treatmentData = [
    { name: "Consultation", cat: "Consultation", desc: "Initial consultation and examination", duration: 30, price: 500, tax: 0 },
    { name: "Dental X-Ray (Periapical)", cat: "Diagnostic", desc: "Single tooth radiograph", duration: 15, price: 300, tax: 18 },
    { name: "OPG (Panoramic X-Ray)", cat: "Diagnostic", desc: "Full mouth panoramic radiograph", duration: 20, price: 800, tax: 18 },
    { name: "Dental Cleaning (Scaling)", cat: "Preventive", desc: "Professional teeth cleaning and scaling", duration: 45, price: 1500, tax: 18 },
    { name: "Fluoride Treatment", cat: "Preventive", desc: "Topical fluoride application", duration: 20, price: 600, tax: 18 },
    { name: "Composite Filling (1 Surface)", cat: "Restorative", desc: "Tooth-colored composite resin filling", duration: 45, price: 2000, tax: 18 },
    { name: "Composite Filling (2+ Surfaces)", cat: "Restorative", desc: "Multi-surface composite filling", duration: 60, price: 3000, tax: 18 },
    { name: "Root Canal Treatment (Anterior)", cat: "Restorative", desc: "Single canal endodontic therapy", duration: 90, price: 5000, tax: 18 },
    { name: "Root Canal Treatment (Posterior)", cat: "Restorative", desc: "Multi-canal endodontic therapy", duration: 120, price: 8000, tax: 18 },
    { name: "Dental Crown (PFM)", cat: "Restorative", desc: "Porcelain fused to metal crown", duration: 60, price: 7000, tax: 18 },
    { name: "Dental Crown (Zirconia)", cat: "Restorative", desc: "All-ceramic zirconia crown", duration: 60, price: 12000, tax: 18 },
    { name: "Tooth Extraction (Simple)", cat: "Surgical", desc: "Simple tooth extraction", duration: 30, price: 1500, tax: 18 },
    { name: "Surgical Extraction (Impacted)", cat: "Surgical", desc: "Surgical removal of impacted tooth", duration: 60, price: 5000, tax: 18 },
    { name: "Dental Implant", cat: "Surgical", desc: "Titanium implant placement", duration: 90, price: 35000, tax: 18 },
    { name: "Teeth Whitening", cat: "Cosmetic", desc: "In-office laser teeth whitening", duration: 60, price: 8000, tax: 18 },
    { name: "Veneers (per tooth)", cat: "Cosmetic", desc: "Porcelain laminate veneer", duration: 90, price: 15000, tax: 18 },
    { name: "Orthodontic Consultation", cat: "Orthodontic", desc: "Braces/aligner consultation", duration: 45, price: 500, tax: 0 },
    { name: "Metal Braces (Full)", cat: "Orthodontic", desc: "Traditional metal orthodontic brackets", duration: 60, price: 25000, tax: 18 },
    { name: "Clear Aligners", cat: "Orthodontic", desc: "Transparent removable aligners", duration: 60, price: 45000, tax: 18 },
    { name: "Denture (Complete)", cat: "Restorative", desc: "Full removable denture per arch", duration: 60, price: 12000, tax: 18 },
  ];

  const createdTreatments: { id: string; name: string; price: number }[] = [];
  let trtCount = 0;
  for (const t of treatmentData) {
    const existing = await prisma.treatment.findFirst({ where: { name: t.name } });
    if (!existing) {
      const created = await prisma.treatment.create({
        data: {
          treatmentId: `TRT-${String(++trtCount).padStart(3, "0")}`,
          name: t.name,
          categoryId: categories[t.cat]?.id,
          description: t.desc,
          duration: t.duration,
          price: t.price,
          taxPercent: t.tax,
        },
      });
      createdTreatments.push({ id: created.id, name: created.name, price: created.price });
    } else {
      trtCount++;
      createdTreatments.push({ id: existing.id, name: existing.name, price: existing.price });
    }
  }
  console.log("✓ Treatments seeded");

  // ─── Suppliers ────────────────────────────────────────────────
  const supplierData = [
    { name: "MediDent Supplies Pvt Ltd", contact: "Anil Bose", phone: "9800000001", email: "sales@medident.in" },
    { name: "DentoTech India", contact: "Kavitha Rao", phone: "9800000002", email: "orders@dentotech.in" },
    { name: "National Dental Corp", contact: "Prakash Menon", phone: "9800000003", email: "b2b@ndc.in" },
    { name: "SurgMed Pharma", contact: "Ritu Sharma", phone: "9800000004", email: "supply@surgmed.in" },
    { name: "OrthoWorld India", contact: "Deepak Nair", phone: "9800000005", email: "info@orthoworld.in" },
  ];
  const createdSuppliers: { id: string }[] = [];
  let supCount = 0;
  for (const s of supplierData) {
    const existing = await prisma.supplier.findFirst({ where: { companyName: s.name } });
    if (!existing) {
      const created = await prisma.supplier.create({
        data: {
          supplierId: `SUP-${String(++supCount).padStart(4, "0")}`,
          companyName: s.name,
          contactPerson: s.contact,
          phone: s.phone,
          email: s.email,
          paymentTerms: "Net 30",
        },
      });
      createdSuppliers.push(created);
    } else {
      supCount++;
      createdSuppliers.push(existing);
    }
  }
  console.log("✓ Suppliers seeded");

  // ─── Inventory Categories ─────────────────────────────────────
  const invCategories: Record<string, { id: string }> = {};
  for (const cat of ["Dental Materials", "Instruments", "Medications", "PPE", "X-Ray", "Orthodontic Supplies", "Surgical Supplies"]) {
    const c = await prisma.inventoryCategory.upsert({
      where: { name: cat },
      update: {},
      create: { name: cat },
    });
    invCategories[cat] = c;
  }

  // ─── Inventory Items ──────────────────────────────────────────
  const inventoryData = [
    { name: "Composite Resin (A2 Shade)", cat: "Dental Materials", sku: "COMP-A2-001", qty: 15, min: 5, price: 1200, unit: "syringe", expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    { name: "Dental Impression Material", cat: "Dental Materials", sku: "IMPR-001", qty: 8, min: 3, price: 800, unit: "kit" },
    { name: "Dental Cement (GIC)", cat: "Dental Materials", sku: "GIC-001", qty: 4, min: 5, price: 650, unit: "pack" },
    { name: "Dental Gloves (Medium)", cat: "PPE", sku: "GLOVE-M-001", qty: 200, min: 50, price: 8, unit: "pair" },
    { name: "Surgical Masks", cat: "PPE", sku: "MASK-001", qty: 150, min: 100, price: 5, unit: "piece" },
    { name: "Amoxicillin 500mg", cat: "Medications", sku: "AMOX-500", qty: 50, min: 20, price: 12, unit: "strip", expiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) },
    { name: "Ibuprofen 400mg", cat: "Medications", sku: "IBU-400", qty: 30, min: 20, price: 10, unit: "strip", expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
    { name: "Dental X-Ray Film", cat: "X-Ray", sku: "XRAY-F-001", qty: 100, min: 30, price: 25, unit: "piece" },
    { name: "Orthodontic Brackets (Metal)", cat: "Orthodontic Supplies", sku: "BRKT-M-001", qty: 50, min: 10, price: 150, unit: "set" },
    { name: "Extraction Forceps Set", cat: "Instruments", sku: "FORC-001", qty: 3, min: 2, price: 5000, unit: "set" },
    { name: "Dental Scalers Set", cat: "Instruments", sku: "SCAL-001", qty: 5, min: 2, price: 2500, unit: "set" },
    { name: "Local Anesthetic (Lignocaine)", cat: "Medications", sku: "LIGN-001", qty: 100, min: 30, price: 15, unit: "vial", expiry: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000) },
  ];

  let invCount = 0;
  for (const item of inventoryData) {
    const existing = await prisma.inventoryItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      const status: InventoryStatusType =
        item.qty === 0 ? "OUT_OF_STOCK" : item.qty <= item.min ? "LOW_STOCK" : "IN_STOCK";
      await prisma.inventoryItem.create({
        data: {
          itemId: `ITEM-${String(++invCount).padStart(4, "0")}`,
          name: item.name,
          categoryId: invCategories[item.cat]?.id,
          sku: item.sku,
          supplierId: createdSuppliers[0]?.id,
          purchasePrice: item.price,
          quantity: item.qty,
          unit: item.unit,
          minStockLevel: item.min,
          expiryDate: item.expiry,
          status,
        },
      });
    } else {
      invCount++;
    }
  }
  console.log("✓ Inventory seeded");

  // ─── Patients ─────────────────────────────────────────────────
  const patientData = [
    { firstName: "Aarav", lastName: "Sharma", dob: "1990-05-15", gender: Gender.MALE, phone: "9811111111", email: "aarav.sharma@email.com", city: "Bengaluru", diabetes: false, hypertension: false },
    { firstName: "Priya", lastName: "Reddy", dob: "1985-08-22", gender: Gender.FEMALE, phone: "9822222222", email: "priya.reddy@email.com", city: "Bengaluru", diabetes: true, hypertension: false },
    { firstName: "Rahul", lastName: "Verma", dob: "1995-03-10", gender: Gender.MALE, phone: "9833333333", email: "rahul.verma@email.com", city: "Mysuru", diabetes: false, hypertension: true },
    { firstName: "Sneha", lastName: "Kumar", dob: "1992-11-30", gender: Gender.FEMALE, phone: "9844444444", email: "sneha.kumar@email.com", city: "Bengaluru", diabetes: false, hypertension: false },
    { firstName: "Vikram", lastName: "Singh", dob: "1978-07-04", gender: Gender.MALE, phone: "9855555555", email: "vikram.singh@email.com", city: "Bengaluru", diabetes: true, hypertension: true },
    { firstName: "Deepika", lastName: "Nair", dob: "1998-01-18", gender: Gender.FEMALE, phone: "9866666666", email: "deepika.nair@email.com", city: "Mangaluru", diabetes: false, hypertension: false },
    { firstName: "Karthik", lastName: "Iyer", dob: "1988-09-25", gender: Gender.MALE, phone: "9877777777", email: "karthik.iyer@email.com", city: "Bengaluru", diabetes: false, hypertension: false },
    { firstName: "Anita", lastName: "Pillai", dob: "2000-04-12", gender: Gender.FEMALE, phone: "9888888888", email: "anita.pillai@email.com", city: "Bengaluru", diabetes: false, hypertension: false },
    { firstName: "Suresh", lastName: "Babu", dob: "1970-12-01", gender: Gender.MALE, phone: "9899999999", email: "suresh.babu@email.com", city: "Hubballi", diabetes: true, hypertension: false },
    { firstName: "Meera", lastName: "Krishnan", dob: "1993-06-20", gender: Gender.FEMALE, phone: "9800011111", email: "meera.krishnan@email.com", city: "Bengaluru", diabetes: false, hypertension: false },
    { firstName: "Rohan", lastName: "Desai", dob: "1987-02-14", gender: Gender.MALE, phone: "9800022222", email: "rohan.desai@email.com", city: "Belagavi", diabetes: false, hypertension: false },
    { firstName: "Lakshmi", lastName: "Venkat", dob: "1975-10-08", gender: Gender.FEMALE, phone: "9800033333", email: "lakshmi.venkat@email.com", city: "Bengaluru", diabetes: true, hypertension: true },
    { firstName: "Aditya", lastName: "Kulkarni", dob: "2002-07-30", gender: Gender.MALE, phone: "9800044444", email: "aditya.kulkarni@email.com", city: "Bengaluru", diabetes: false, hypertension: false },
    { firstName: "Pooja", lastName: "Gowda", dob: "1996-03-16", gender: Gender.FEMALE, phone: "9800055555", email: "pooja.gowda@email.com", city: "Tumakuru", diabetes: false, hypertension: false },
    { firstName: "Naveen", lastName: "Rao", dob: "1983-08-05", gender: Gender.MALE, phone: "9800066666", email: "naveen.rao@email.com", city: "Bengaluru", diabetes: false, hypertension: false },
  ];

  const createdPatients: { id: string }[] = [];
  let patCount = 0;
  for (const p of patientData) {
    const existing = await prisma.patient.findFirst({ where: { phone: p.phone } });
    if (!existing) {
      const pat = await prisma.patient.create({
        data: {
          patientId: `PAT-${String(++patCount).padStart(5, "0")}`,
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: new Date(p.dob),
          gender: p.gender,
          phone: p.phone,
          email: p.email,
          city: p.city,
          state: "Karnataka",
          country: "India",
          registeredBy: admin.id,
          medicalHistory: {
            create: {
              diabetes: p.diabetes,
              hypertension: p.hypertension,
              allergies: p.diabetes ? "Penicillin" : undefined,
            },
          },
          dentalInfo: {
            create: {
              smokingStatus: SmokingStatus.NON_SMOKER,
              treatmentConsent: true,
              privacyConsent: true,
            },
          },
          dentalChart: {
            create: {},
          },
        },
      });
      createdPatients.push(pat);
    } else {
      patCount++;
      createdPatients.push(existing);
    }
  }
  console.log("✓ Patients seeded");

  // ─── Appointments ─────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointmentData = [
    { patIdx: 0, docIdx: 0, daysOffset: 0, start: "09:00", end: "10:00", status: AppointmentStatus.CONFIRMED, trtIdx: 0 },
    { patIdx: 1, docIdx: 0, daysOffset: 0, start: "10:30", end: "12:00", status: AppointmentStatus.IN_TREATMENT, trtIdx: 7 },
    { patIdx: 2, docIdx: 1, daysOffset: 0, start: "09:30", end: "10:30", status: AppointmentStatus.CHECKED_IN, trtIdx: 16 },
    { patIdx: 3, docIdx: 2, daysOffset: 0, start: "11:00", end: "12:00", status: AppointmentStatus.SCHEDULED, trtIdx: 3 },
    { patIdx: 4, docIdx: 0, daysOffset: 0, start: "14:00", end: "15:00", status: AppointmentStatus.SCHEDULED, trtIdx: 11 },
    { patIdx: 5, docIdx: 1, daysOffset: 0, start: "15:30", end: "16:00", status: AppointmentStatus.SCHEDULED, trtIdx: 0 },
    { patIdx: 0, docIdx: 2, daysOffset: 1, start: "09:00", end: "10:30", status: AppointmentStatus.SCHEDULED, trtIdx: 8 },
    { patIdx: 6, docIdx: 0, daysOffset: 1, start: "10:00", end: "11:00", status: AppointmentStatus.SCHEDULED, trtIdx: 3 },
    { patIdx: 7, docIdx: 1, daysOffset: 1, start: "11:00", end: "12:00", status: AppointmentStatus.SCHEDULED, trtIdx: 5 },
    { patIdx: 1, docIdx: 2, daysOffset: -1, start: "10:00", end: "11:30", status: AppointmentStatus.COMPLETED, trtIdx: 7 },
    { patIdx: 8, docIdx: 0, daysOffset: -1, start: "14:00", end: "15:00", status: AppointmentStatus.COMPLETED, trtIdx: 3 },
    { patIdx: 9, docIdx: 1, daysOffset: -2, start: "09:00", end: "10:00", status: AppointmentStatus.COMPLETED, trtIdx: 0 },
    { patIdx: 2, docIdx: 2, daysOffset: -3, start: "11:00", end: "12:30", status: AppointmentStatus.CANCELLED, trtIdx: 9 },
    { patIdx: 10, docIdx: 0, daysOffset: 2, start: "09:00", end: "10:00", status: AppointmentStatus.SCHEDULED, trtIdx: 0 },
    { patIdx: 11, docIdx: 1, daysOffset: 3, start: "14:00", end: "15:30", status: AppointmentStatus.SCHEDULED, trtIdx: 17 },
    { patIdx: 3, docIdx: 0, daysOffset: -5, start: "09:00", end: "10:00", status: AppointmentStatus.NO_SHOW, trtIdx: 3 },
    { patIdx: 12, docIdx: 2, daysOffset: -7, start: "10:00", end: "11:00", status: AppointmentStatus.COMPLETED, trtIdx: 14 },
    { patIdx: 13, docIdx: 0, daysOffset: 5, start: "15:00", end: "16:00", status: AppointmentStatus.SCHEDULED, trtIdx: 5 },
    { patIdx: 14, docIdx: 1, daysOffset: 7, start: "09:00", end: "10:30", status: AppointmentStatus.SCHEDULED, trtIdx: 18 },
    { patIdx: 4, docIdx: 2, daysOffset: -14, start: "11:00", end: "12:00", status: AppointmentStatus.COMPLETED, trtIdx: 11 },
  ];

  const doctors = [doctor1, doctor2, doctor3];
  let aptCount = 0;
  const createdAppointments: { id: string; patientId: string; doctorId: string; status: AppointmentStatusType }[] = [];

  for (const a of appointmentData) {
    const date = new Date(today);
    date.setDate(date.getDate() + a.daysOffset);
    const pat = createdPatients[a.patIdx];
    const doc = doctors[a.docIdx];
    const room = createdRooms[a.docIdx % createdRooms.length];
    const trt = createdTreatments[a.trtIdx];

    if (!pat || !doc) continue;

    const aptId = `APT-${String(++aptCount).padStart(5, "0")}`;
    const existing = await prisma.appointment.findFirst({ where: { appointmentId: aptId } });
    if (!existing) {
      const apt = await prisma.appointment.create({
        data: {
          appointmentId: aptId,
          patientId: pat.id,
          doctorId: doc.id,
          roomId: room?.id,
          date,
          startTime: a.start,
          endTime: a.end,
          status: a.status,
          treatments: trt ? { create: [{ treatmentId: trt.id }] } : undefined,
        },
      });
      createdAppointments.push({ id: apt.id, patientId: apt.patientId, doctorId: apt.doctorId, status: apt.status as AppointmentStatusType });
    }
  }
  console.log("✓ Appointments seeded");

  // ─── Invoices & Payments ──────────────────────────────────────
  const completedApts = createdAppointments.filter((a) => a.status === "COMPLETED");
  let invNum = 0;
  let payNum = 0;

  for (const apt of completedApts.slice(0, 8)) {
    const trt = createdTreatments[Math.floor(Math.random() * 5)];
    const price = trt?.price ?? 1500;
    const tax = price * 0.18;
    const total = price + tax;
    const paid = invNum % 3 === 0 ? total : invNum % 3 === 1 ? total / 2 : 0;
    const balance = total - paid;
    const status: InvoiceStatusType =
      paid >= total ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "UNPAID";

    const inv = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-${String(++invNum).padStart(5, "0")}`,
        patientId: apt.patientId,
        doctorId: apt.doctorId,
        appointmentId: apt.id,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: price,
        taxPercent: 18,
        taxAmount: tax,
        total,
        amountPaid: paid,
        balanceDue: balance,
        status,
        items: {
          create: [
            {
              treatmentId: trt?.id,
              description: trt?.name ?? "Dental Treatment",
              quantity: 1,
              unitPrice: price,
              tax,
              amount: total,
            },
          ],
        },
      },
    });

    if (paid > 0) {
      await prisma.payment.create({
        data: {
          paymentId: `PAY-${String(++payNum).padStart(5, "0")}`,
          invoiceId: inv.id,
          patientId: apt.patientId,
          amount: paid,
          method: PaymentMethod.CASH,
          recordedById: admin.id,
        },
      });
    }
  }
  console.log("✓ Invoices and payments seeded");

  // ─── Expenses ─────────────────────────────────────────────────
  const expenseData = [
    { cat: ExpenseCategory.RENT, desc: "Monthly clinic rent", amount: 50000, vendor: "Property Solutions" },
    { cat: ExpenseCategory.UTILITIES, desc: "Electricity bill", amount: 8500, vendor: "BESCOM" },
    { cat: ExpenseCategory.SALARIES, desc: "Staff salaries - September", amount: 180000, vendor: "" },
    { cat: ExpenseCategory.SUPPLIES, desc: "Dental supply restock", amount: 25000, vendor: "MediDent Supplies" },
    { cat: ExpenseCategory.MAINTENANCE, desc: "Dental chair servicing", amount: 12000, vendor: "DentEquip Services" },
    { cat: ExpenseCategory.MARKETING, desc: "Google Ads - September", amount: 5000, vendor: "Google LLC" },
  ];

  let expCount = 0;
  for (const e of expenseData) {
    const existing = await prisma.expense.findFirst({ where: { description: e.desc } });
    if (!existing) {
      await prisma.expense.create({
        data: {
          expenseId: `EXP-${String(++expCount).padStart(5, "0")}`,
          category: e.cat,
          description: e.desc,
          amount: e.amount,
          date: new Date(),
          method: PaymentMethod.BANK_TRANSFER,
          vendor: e.vendor || undefined,
          createdById: admin.id,
        },
      });
    } else {
      expCount++;
    }
  }
  console.log("✓ Expenses seeded");

  // ─── Notifications ────────────────────────────────────────────
  const allUsers = await prisma.user.findMany({ where: { isActive: true } });
  const notifData = [
    { type: "LOW_INVENTORY" as const, title: "Low Stock Alert", msg: "Dental Cement (GIC) is running low. Only 4 units remaining." },
    { type: "APPOINTMENT_UPCOMING" as const, title: "Appointment Reminder", msg: "You have 6 appointments scheduled for today." },
    { type: "INVOICE_OVERDUE" as const, title: "Overdue Invoice", msg: "Invoice INV-2026-00002 from Rahul Verma is overdue." },
    { type: "EXPIRY_ALERT" as const, title: "Expiry Warning", msg: "Ibuprofen 400mg expires in 90 days. Consider using or reordering." },
  ];

  for (const user of allUsers.slice(0, 2)) {
    for (const n of notifData) {
      const existing = await prisma.notification.findFirst({
        where: { userId: user.id, title: n.title },
      });
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: n.type,
            title: n.title,
            message: n.msg,
            isRead: false,
          },
        });
      }
    }
  }
  // ─── Feedbacks & Reviews ──────────────────────────────────────
  const sampleFeedbacks = [
    {
      patientName: "Kavitha Sundaram",
      patientPhone: "9876543210",
      rating: 5,
      category: "TREATMENT",
      comment: "Completely pain-free root canal treatment! Dr. Ananya was so gentle and explained each step on the digital imaging monitor. Exceptional clinic hygiene standards.",
      treatment: "Root Canal & Zirconia Crown",
      doctorName: "Dr. Ananya Rao",
      isPublic: true,
    },
    {
      patientName: "Rahul Verma",
      patientPhone: "9811111111",
      rating: 5,
      category: "DOCTOR",
      comment: "The 3D smile design preview was incredible! Extremely knowledgeable orthodontist, transparent pricing, and zero wait time.",
      treatment: "Invisible Aligners Consultation",
      doctorName: "Dr. Vikram Sethi",
      isPublic: true,
    },
    {
      patientName: "Meera Krishnan",
      patientPhone: "9822222222",
      rating: 5,
      category: "CLEANLINESS",
      comment: "Hospital-grade European sterilization standards and super polite reception desk. Accessing invoices and previous X-Rays via the mobile portal made everything effortless!",
      treatment: "Ultrasonic Teeth Cleaning & Scaling",
      doctorName: "Dr. Sneha Patil",
      isPublic: true,
    },
    {
      patientName: "Amitabh Sen",
      patientPhone: "9833333333",
      rating: 5,
      category: "GENERAL",
      comment: "Quick online booking, seamless UPI billing, and great diagnostic care. The best dental clinic in Bengaluru by far.",
      treatment: "Dental Implant Consultation",
      doctorName: "Dr. Ananya Rao",
      isPublic: true,
    },
  ];

  const firstPatient = await prisma.patient.findFirst({ where: { phone: "9876543210" } });
  for (const fb of sampleFeedbacks) {
    const existing = await prisma.feedback.findFirst({
      where: { patientName: fb.patientName, comment: fb.comment },
    });
    if (!existing) {
      await prisma.feedback.create({
        data: {
          patientId: firstPatient?.id || null,
          patientName: fb.patientName,
          patientPhone: fb.patientPhone,
          rating: fb.rating,
          category: fb.category,
          comment: fb.comment,
          treatment: fb.treatment,
          doctorName: fb.doctorName,
          isPublic: fb.isPublic,
        },
      });
    }
  }
  console.log("✓ Feedbacks & Testimonials seeded");

  // ─── Patient Documents ─────────────────────────────────────────
  if (firstPatient) {
    const sampleDocs = [
      {
        name: "Full Mouth Panoramic OPG X-Ray",
        type: "X_RAY",
        url: "/images/hero_clinic.jpg",
        size: 2450000,
        mimeType: "image/jpeg",
        uploadedBy: "Patient (Self Upload)",
      },
      {
        name: "Previous Orthodontic Treatment History",
        type: "PREVIOUS_RECORD",
        url: "/images/treatment_cleaning.jpg",
        size: 1840000,
        mimeType: "image/jpeg",
        uploadedBy: "Dr. Ananya Rao (DENTIST)",
      },
    ];

    for (const d of sampleDocs) {
      const existing = await prisma.patientDocument.findFirst({
        where: { patientId: firstPatient.id, name: d.name },
      });
      if (!existing) {
        await prisma.patientDocument.create({
          data: {
            patientId: firstPatient.id,
            name: d.name,
            type: d.type,
            url: d.url,
            size: d.size,
            mimeType: d.mimeType,
            uploadedBy: d.uploadedBy,
          },
        });
      }
    }
    console.log("✓ Sample patient documents seeded");
  }

  console.log("\n🎉 Database seeded successfully!");
  console.log("\n📋 Demo accounts:");
  console.log("  admin@dentalcare.com       / Admin@123");
  console.log("  dentist@dentalcare.com     / Dentist@123");
  console.log("  dentist2@dentalcare.com    / Dentist@123");
  console.log("  dentist3@dentalcare.com    / Dentist@123");
  console.log("  reception@dentalcare.com   / Recept@123");
  console.log("  accountant@dentalcare.com  / Account@123");
  console.log("  inventory@dentalcare.com   / Invent@123");
  console.log("  assistant@dentalcare.com   / Recept@123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
