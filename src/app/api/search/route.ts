import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser, serverError } from "@/lib/api-helpers";
import { hasPermission, Role } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    if (q.length < 2) return NextResponse.json({ results: [] });

    const role = user.role as Role;
    const results: Array<{ type: string; id: string; name: string; subtitle?: string; href: string }> = [];

    // Search patients
    if (hasPermission(role, "patients:read")) {
      const patients = await prisma.patient.findMany({
        where: {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { patientId: { contains: q } },
            { phone: { contains: q } },
          ],
          status: { not: "ARCHIVED" },
        },
        select: { id: true, patientId: true, firstName: true, lastName: true, phone: true },
        take: 5,
      });

      results.push(
        ...patients.map((p) => ({
          type: "Patients",
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          subtitle: `${p.patientId} · ${p.phone}`,
          href: `/patients`,
        }))
      );
    }

    // Search appointments
    if (hasPermission(role, "appointments:read")) {
      const appointments = await prisma.appointment.findMany({
        where: {
          OR: [
            { appointmentId: { contains: q } },
            { patient: { firstName: { contains: q } } },
            { patient: { lastName: { contains: q } } },
          ],
        },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          treatments: { include: { treatment: { select: { name: true } } }, take: 1 },
        },
        take: 5,
        orderBy: { date: "desc" },
      });

      results.push(
        ...appointments.map((a) => ({
          type: "Appointments",
          id: a.id,
          name: `${a.patient.firstName} ${a.patient.lastName}`,
          subtitle: `${a.appointmentId} · ${a.treatments[0]?.treatment.name ?? "General"} · ${a.startTime}`,
          href: `/appointments`,
        }))
      );
    }

    // Search invoices
    if (hasPermission(role, "billing:read")) {
      const invoices = await prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: q } },
            { patient: { firstName: { contains: q } } },
          ],
        },
        include: { patient: { select: { firstName: true, lastName: true } } },
        take: 5,
        orderBy: { createdAt: "desc" },
      });

      results.push(
        ...invoices.map((inv) => ({
          type: "Invoices",
          id: inv.id,
          name: inv.invoiceNumber,
          subtitle: `${inv.patient.firstName} ${inv.patient.lastName} · ₹${inv.total.toFixed(2)} · ${inv.status}`,
          href: `/invoices`,
        }))
      );
    }

    // Search inventory
    if (hasPermission(role, "inventory:read")) {
      const items = await prisma.inventoryItem.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { sku: { contains: q } },
            { itemId: { contains: q } },
          ],
        },
        take: 5,
      });

      results.push(
        ...items.map((i) => ({
          type: "Inventory",
          id: i.id,
          name: i.name,
          subtitle: `${i.itemId} · ${i.quantity} ${i.unit}s · ${i.status}`,
          href: `/inventory`,
        }))
      );
    }

    // Search doctors
    if (hasPermission(role, "doctors:read")) {
      const doctors = await prisma.doctor.findMany({
        where: {
          OR: [
            { user: { name: { contains: q } } },
            { specialization: { contains: q } },
          ],
        },
        include: { user: { select: { name: true, email: true } } },
        take: 3,
      });

      results.push(
        ...doctors.map((d) => ({
          type: "Doctors",
          id: d.id,
          name: d.user.name,
          subtitle: d.specialization,
          href: `/doctors`,
        }))
      );
    }

    return NextResponse.json({ results });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
