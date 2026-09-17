import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, createAuditLog, badRequest, notFound, serverError } from "@/lib/api-helpers";
import { patientSchema } from "@/lib/validations";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requirePermission("patients:read");
  if (error) return error;

  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        emergencyContact: true,
        medicalHistory: true,
        dentalInfo: true,
        dentalChart: { include: { entries: { orderBy: { recordedAt: "desc" } } } },
        appointments: {
          include: {
            doctor: { include: { user: { select: { name: true } } } },
            treatments: { include: { treatment: true } },
          },
          orderBy: { date: "desc" },
        },
        clinicalNotes: {
          include: {
            doctor: { include: { user: { select: { name: true } } } },
            author: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        treatmentPlans: {
          include: {
            doctor: { include: { user: { select: { name: true } } } },
            items: { include: { treatment: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        prescriptions: {
          include: {
            doctor: { include: { user: { select: { name: true } } } },
            items: true,
          },
          orderBy: { createdAt: "desc" },
        },
        invoices: {
          include: { items: true, payments: true },
          orderBy: { createdAt: "desc" },
        },
        payments: {
          include: { invoice: { select: { invoiceNumber: true } } },
          orderBy: { createdAt: "desc" },
        },
        documents: { where: { isArchived: false }, orderBy: { uploadedAt: "desc" } },
      },
    });

    if (!patient) return notFound("Patient");
    return NextResponse.json({ data: patient });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, user } = await requirePermission("patients:write");
  if (error) return error;

  try {
    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) return notFound("Patient");

    const body = await req.json();
    const parsed = patientSchema.partial().safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const data = parsed.data;

    // Check duplicate phone (excluding self)
    if (data.phone && data.phone !== existing.phone) {
      const dup = await prisma.patient.findFirst({ where: { phone: data.phone } });
      if (dup) return NextResponse.json({ error: "Phone number already used by another patient." }, { status: 409 });
    }

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.dateOfBirth !== undefined && { dateOfBirth: new Date(data.dateOfBirth) }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.bloodGroup !== undefined && { bloodGroup: data.bloodGroup }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.postalCode !== undefined && { postalCode: data.postalCode || null }),
        ...(data.country !== undefined && { country: data.country }),
      },
    });

    // Update sub-models
    if (data.emergencyName !== undefined) {
      await prisma.emergencyContact.upsert({
        where: { patientId: id },
        update: { name: data.emergencyName, relationship: data.emergencyRelationship ?? "", phone: data.emergencyPhone ?? "" },
        create: { patientId: id, name: data.emergencyName, relationship: data.emergencyRelationship ?? "", phone: data.emergencyPhone ?? "" },
      });
    }

    if (data.allergies !== undefined || data.diabetes !== undefined) {
      await prisma.medicalHistory.upsert({
        where: { patientId: id },
        update: {
          ...(data.allergies !== undefined && { allergies: data.allergies }),
          ...(data.conditions !== undefined && { conditions: data.conditions }),
          ...(data.medications !== undefined && { medications: data.medications }),
          ...(data.diabetes !== undefined && { diabetes: data.diabetes }),
          ...(data.hypertension !== undefined && { hypertension: data.hypertension }),
          ...(data.isPregnant !== undefined && { isPregnant: data.isPregnant }),
          ...(data.medicalNotes !== undefined && { notes: data.medicalNotes }),
        },
        create: {
          patientId: id,
          diabetes: data.diabetes ?? false,
          hypertension: data.hypertension ?? false,
        },
      });
    }

    await createAuditLog({
      userId: user!.id,
      action: "PATIENT_UPDATED",
      entity: "Patient",
      entityId: patient.id,
      previousData: { name: `${existing.firstName} ${existing.lastName}` },
      newData: { name: `${patient.firstName} ${patient.lastName}` },
      req,
    });

    return NextResponse.json({ data: patient, message: "Patient updated successfully." });
  } catch (e) {
    console.error(e);
    return serverError("Unable to update patient. Please try again.");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, user } = await requirePermission("patients:delete");
  if (error) return error;

  try {
    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) return notFound("Patient");

    // Soft delete — archive instead
    await prisma.patient.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await createAuditLog({
      userId: user!.id,
      action: "PATIENT_ARCHIVED",
      entity: "Patient",
      entityId: id,
      req,
    });

    return NextResponse.json({ message: "Patient archived successfully." });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
