import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, createAuditLog, parsePaginationParams, badRequest, serverError } from "@/lib/api-helpers";
import { patientSchema } from "@/lib/validations";
import { generatePatientId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error, user } = await requirePermission("patients:read");
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePaginationParams(req);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const gender = searchParams.get("gender") ?? "";
    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (gender) where.gender = gender;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { patientId: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          invoices: {
            select: { balanceDue: true, status: true },
          },
          appointments: {
            where: { date: { gte: new Date() } },
            orderBy: { date: "asc" },
            take: 1,
            select: { date: true, startTime: true },
          },
          _count: {
            select: { appointments: true },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    const patientsWithBalance = patients.map((p) => ({
      ...p,
      outstandingBalance: p.invoices.reduce((sum, inv) => sum + (inv.balanceDue ?? 0), 0),
      nextAppointment: p.appointments[0] ?? null,
    }));

    return NextResponse.json({
      data: patientsWithBalance,
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
  const { error, user } = await requirePermission("patients:write");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = patientSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const data = parsed.data;

    // Check for duplicate phone
    const existing = await prisma.patient.findFirst({
      where: { phone: data.phone },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A patient with this phone number already exists." },
        { status: 409 }
      );
    }

    const count = await prisma.patient.count();
    const patientId = generatePatientId(count);

    const patient = await prisma.patient.create({
      data: {
        patientId,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode || undefined,
        country: data.country,
        registeredBy: user!.id,
        emergencyContact: data.emergencyName
          ? {
              create: {
                name: data.emergencyName,
                relationship: data.emergencyRelationship ?? "",
                phone: data.emergencyPhone ?? "",
              },
            }
          : undefined,
        medicalHistory: {
          create: {
            allergies: data.allergies,
            conditions: data.conditions,
            medications: data.medications,
            surgeries: data.surgeries,
            diabetes: data.diabetes,
            hypertension: data.hypertension,
            isPregnant: data.isPregnant,
            notes: data.medicalNotes,
          },
        },
        dentalInfo: {
          create: {
            previousTreatments: data.previousTreatments,
            dentalConcerns: data.dentalConcerns,
            oralHygieneNotes: data.oralHygieneNotes,
            smokingStatus: data.smokingStatus,
            previousDentist: data.previousDentist,
            treatmentConsent: data.treatmentConsent,
            privacyConsent: data.privacyConsent,
          },
        },
        dentalChart: { create: {} },
      },
    });

    await createAuditLog({
      userId: user!.id,
      action: "PATIENT_CREATED",
      entity: "Patient",
      entityId: patient.id,
      newData: { patientId: patient.patientId, name: `${patient.firstName} ${patient.lastName}` },
      req,
    });

    return NextResponse.json({ data: patient, message: "Patient registered successfully." }, { status: 201 });
  } catch (e) {
    console.error(e);
    return serverError("Unable to save the patient. Please check the information and try again.");
  }
}
