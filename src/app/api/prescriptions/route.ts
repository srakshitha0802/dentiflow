import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requirePermission,
  createAuditLog,
  parsePaginationParams,
  badRequest,
  serverError,
} from "@/lib/api-helpers";
import { prescriptionSchema } from "@/lib/validations";
import { generatePrescriptionId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("clinical:read");
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePaginationParams(req);
    const patientId = searchParams.get("patientId") ?? "";
    const doctorId = searchParams.get("doctorId") ?? "";
    const search = searchParams.get("search") ?? "";

    const where: Record<string, unknown> = {};
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (search) {
      where.OR = [
        { prescriptionId: { contains: search } },
        { patient: { firstName: { contains: search } } },
        { patient: { lastName: { contains: search } } },
        { patient: { phone: { contains: search } } },
      ];
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          patient: {
            select: {
              id: true,
              patientId: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              gender: true,
              phone: true,
            },
          },
          doctor: {
            select: {
              id: true,
              qualification: true,
              specialization: true,
              registrationNumber: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          items: true,
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    return NextResponse.json({
      data: prescriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { error, user } = await requirePermission("clinical:write");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = prescriptionSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const data = parsed.data;

    // Verify patient and doctor exist
    const [patient, doctor] = await Promise.all([
      prisma.patient.findUnique({ where: { id: data.patientId } }),
      prisma.doctor.findUnique({ where: { id: data.doctorId } }),
    ]);

    if (!patient) return badRequest("Patient not found");
    if (!doctor) return badRequest("Doctor not found");

    const count = await prisma.prescription.count();
    const prescriptionId = generatePrescriptionId(count);

    const prescription = await prisma.prescription.create({
      data: {
        prescriptionId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        authorId: user!.id,
        notes: data.notes,
        items: {
          create: data.items.map((it) => ({
            medication: it.medication,
            dosage: it.dosage,
            frequency: it.frequency,
            duration: it.duration,
            instructions: it.instructions,
          })),
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            patientId: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            id: true,
            qualification: true,
            specialization: true,
            registrationNumber: true,
            user: { select: { name: true } },
          },
        },
        items: true,
      },
    });

    await createAuditLog({
      userId: user!.id,
      action: "PRESCRIPTION_CREATED",
      entity: "Prescription",
      entityId: prescription.id,
      newData: {
        prescriptionId: prescription.prescriptionId,
        patientId: prescription.patientId,
        itemCount: prescription.items.length,
      },
      req,
    });

    return NextResponse.json(
      { data: prescription, message: "Prescription issued successfully." },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return serverError("Unable to issue prescription. Please try again.");
  }
}
