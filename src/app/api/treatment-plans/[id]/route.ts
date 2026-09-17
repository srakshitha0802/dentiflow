import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requirePermission,
  createAuditLog,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requirePermission("treatments:read");
  if (error) return error;

  try {
    const plan = await prisma.treatmentPlan.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        items: {
          include: {
            treatment: true,
          },
        },
      },
    });

    if (!plan) return notFound("Treatment Plan");
    return NextResponse.json({ data: plan });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, user } = await requirePermission("treatments:write");
  if (error) return error;

  try {
    const existing = await prisma.treatmentPlan.findUnique({ where: { id } });
    if (!existing) return notFound("Treatment Plan");

    const body = await req.json();

    // Fast status update
    if (body.status && Object.keys(body).length === 1) {
      const updated = await prisma.treatmentPlan.update({
        where: { id },
        data: { status: body.status },
        include: {
          patient: true,
          doctor: { include: { user: true } },
          items: { include: { treatment: true } },
        },
      });

      await createAuditLog({
        userId: user!.id,
        action: "TREATMENT_PLAN_STATUS_UPDATED",
        entity: "TreatmentPlan",
        entityId: id,
        previousData: { status: existing.status },
        newData: { status: body.status },
        req,
      });

      return NextResponse.json({
        data: updated,
        message: `Plan status updated to ${body.status}.`,
      });
    }

    const updated = await prisma.treatmentPlan.update({
      where: { id },
      data: {
        ...(body.diagnosis !== undefined && { diagnosis: body.diagnosis }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        items: { include: { treatment: true } },
      },
    });

    await createAuditLog({
      userId: user!.id,
      action: "TREATMENT_PLAN_UPDATED",
      entity: "TreatmentPlan",
      entityId: id,
      req,
    });

    return NextResponse.json({
      data: updated,
      message: "Treatment plan updated successfully.",
    });
  } catch (e) {
    console.error(e);
    return serverError("Unable to update treatment plan.");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, user } = await requirePermission("treatments:write");
  if (error) return error;

  try {
    const existing = await prisma.treatmentPlan.findUnique({ where: { id } });
    if (!existing) return notFound("Treatment Plan");

    await prisma.treatmentPlan.delete({ where: { id } });

    await createAuditLog({
      userId: user!.id,
      action: "TREATMENT_PLAN_DELETED",
      entity: "TreatmentPlan",
      entityId: id,
      previousData: { planId: existing.planId },
      req,
    });

    return NextResponse.json({
      message: "Treatment plan deleted successfully.",
    });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
