import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requirePermission,
  createAuditLog,
  parsePaginationParams,
  badRequest,
  serverError,
} from "@/lib/api-helpers";
import { treatmentPlanSchema } from "@/lib/validations";
import { generatePlanId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("treatments:read");
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePaginationParams(req);
    const status = searchParams.get("status") ?? "";
    const patientId = searchParams.get("patientId") ?? "";
    const doctorId = searchParams.get("doctorId") ?? "";
    const search = searchParams.get("search") ?? "";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (search) {
      where.OR = [
        { planId: { contains: search } },
        { diagnosis: { contains: search } },
        { patient: { firstName: { contains: search } } },
        { patient: { lastName: { contains: search } } },
      ];
    }

    const [plans, total] = await Promise.all([
      prisma.treatmentPlan.findMany({
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
              phone: true,
            },
          },
          doctor: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          items: {
            include: {
              treatment: {
                select: {
                  name: true,
                  price: true,
                },
              },
            },
          },
        },
      }),
      prisma.treatmentPlan.count({ where }),
    ]);

    return NextResponse.json({
      data: plans,
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
  const { error, user } = await requirePermission("treatments:write");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = treatmentPlanSchema.safeParse(body);
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

    const totalEstimatedCost = data.items.reduce(
      (sum, it) => sum + (it.estimatedCost || 0),
      0
    );

    const count = await prisma.treatmentPlan.count();
    const planId = generatePlanId(count);

    const plan = await prisma.treatmentPlan.create({
      data: {
        planId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        diagnosis: data.diagnosis,
        notes: data.notes,
        priority: data.priority,
        status: data.status || "PROPOSED",
        estimatedCost: totalEstimatedCost,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        expectedCompletion: data.expectedCompletion
          ? new Date(data.expectedCompletion)
          : undefined,
        items: {
          create: data.items.map((it) => ({
            treatmentId: it.treatmentId,
            toothNumbers: it.toothNumbers,
            sessions: it.sessions,
            estimatedCost: it.estimatedCost,
            notes: it.notes,
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
            phone: true,
          },
        },
        doctor: {
          include: {
            user: { select: { name: true } },
          },
        },
        items: {
          include: {
            treatment: true,
          },
        },
      },
    });

    await createAuditLog({
      userId: user!.id,
      action: "TREATMENT_PLAN_CREATED",
      entity: "TreatmentPlan",
      entityId: plan.id,
      newData: {
        planId: plan.planId,
        patientId: plan.patientId,
        estimatedCost: plan.estimatedCost,
      },
      req,
    });

    return NextResponse.json(
      { data: plan, message: "Treatment plan created successfully." },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return serverError("Unable to create treatment plan. Please try again.");
  }
}
