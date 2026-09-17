import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requirePermission,
  createAuditLog,
  parsePaginationParams,
  badRequest,
  serverError,
} from "@/lib/api-helpers";
import { clinicalNoteSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("clinical:read");
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePaginationParams(req);
    const patientId = searchParams.get("patientId") ?? "";
    const doctorId = searchParams.get("doctorId") ?? "";

    const where: Record<string, unknown> = {};
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;

    const [notes, total] = await Promise.all([
      prisma.clinicalNote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          patient: {
            select: {
              id: true,
              patientId: true,
              firstName: true,
              lastName: true,
            },
          },
          doctor: {
            include: {
              user: { select: { name: true } },
            },
          },
          author: { select: { name: true } },
        },
      }),
      prisma.clinicalNote.count({ where }),
    ]);

    return NextResponse.json({
      data: notes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
    const parsed = clinicalNoteSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const data = parsed.data;

    // Determine doctor ID
    let doctorId = body.doctorId;
    if (!doctorId) {
      const doc = await prisma.doctor.findFirst({
        where: { userId: user!.id },
      });
      if (doc) doctorId = doc.id;
      else {
        const firstDoc = await prisma.doctor.findFirst();
        if (firstDoc) doctorId = firstDoc.id;
      }
    }

    if (!doctorId) {
      return badRequest("Doctor ID is required to record clinical notes.");
    }

    const note = await prisma.clinicalNote.create({
      data: {
        patientId: data.patientId,
        doctorId,
        appointmentId: data.appointmentId || undefined,
        chiefComplaint: data.chiefComplaint,
        examination: data.examination,
        diagnosis: data.diagnosis,
        treatmentDone: data.treatmentDone,
        recommendations: data.recommendations,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
        authorId: user!.id,
      },
      include: {
        patient: {
          select: { firstName: true, lastName: true },
        },
        doctor: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    await createAuditLog({
      userId: user!.id,
      action: "CLINICAL_NOTE_CREATED",
      entity: "ClinicalNote",
      entityId: note.id,
      req,
    });

    return NextResponse.json(
      { data: note, message: "Clinical note recorded successfully." },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return serverError("Unable to record clinical note.");
  }
}
