# DentiFlow — Modern Dental Clinic & Patient Care System

DentiFlow is a production-grade, full-stack Dental Clinic Management and Patient Care platform built with Next.js 16 (App Router & Turbopack), TypeScript, Tailwind CSS, Prisma ORM, and SQLite/PostgreSQL.

---

## Key Features

### 1. Patient Portal & Online Self-Service
- **Interactive 5-Step Appointment Booking Wizard**: Treatment procedure selection, specialist doctor picking, real-time slot availability, instant SMS/Email pass generation.
- **Patient Self-Service Portal**:
  - Upcoming and historical appointments.
  - One-click appointment rescheduling with real-time calendar slots.
  - Instant appointment cancellation with reason recording.
  - Itemized bills, GST tax invoices, and printable PDF/receipt views.
  - Integrated online payment simulation (UPI & Credit/Debit cards).
  - Digital prescriptions and treatment progress notes.
- **Dual-Mode Login**: Phone Number / Email / Patient ID lookup for patients, and NextAuth credentials for clinic staff.

### 2. Clinic Operations & Doctor Dashboard
- **Comprehensive Clinical Practice Dashboard**:
  - Live patient queue, appointment scheduling, and calendar views.
  - Electronic Medical Records (EMR) & full patient history.
  - Interactive Dental Charting (Adult & Pediatric tooth notation, conditions, and treatments).
  - Treatment Plan management with multi-stage procedures and cost tracking.
  - Billing, itemized invoices, payment receipts, and financial analytics.
  - Prescription management with dosage, frequency, and instructions.
  - Inventory tracking, lab orders, and staff management.
  - Clinic operational reports and revenue analytics.

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Lucide Icons, Clinical Teal Design System
- **Database & ORM**: SQLite (Development) / PostgreSQL (Production) with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) & Patient Identifier Lookup
- **State & Data Fetching**: React Query (@tanstack/react-query), React Hook Form, Zod

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/srakshitha0802/dentiflow.git
cd dentiflow
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

### 3. Initialize Database & Seed Sample Data

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Default Staff Accounts (Seeded)

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@dentalcare.com` | `admin123` |
| **Doctor** | `doctor@dentalcare.com` | `doctor123` |
| **Receptionist** | `receptionist@dentalcare.com` | `reception123` |

---

## License

This project is licensed under the MIT License.
