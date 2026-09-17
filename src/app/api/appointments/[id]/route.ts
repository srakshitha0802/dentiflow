import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, createAuditLog, notFound, badRequest, serverError } from "@/lib/api-helpers";
import { appointmentSchema } from "@/lib/validations";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requirePermission("appointments:read");
  if (error) return error;

  try {
    const apt = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        room: true,
        treatments: { include: { treatment: true } },
        clinicalNotes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
        invoice: { include: { items: true, payments: true } },
      },
    });
    if (!apt) return notFound("Appointment");
    return NextResponse.json({ data: apt });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, user } = await requirePermission("appointments:write");
  if (error) return error;

  try {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) return notFound("Appointment");

    const body = await req.json();

    // Status-only update (e.g., check-in, confirm, complete)
    if (body.status && Object.keys(body).length === 1) {
      const updated = await prisma.appointment.update({
        where: { id },
        data: { status: body.status },
      });
      await createAuditLog({
        userId: user!.id,
        action: "APPOINTMENT_STATUS_CHANGED",
        entity: "Appointment",
        entityId: id,
        previousData: { status: existing.status },
        newData: { status: body.status },
        req,
      });
      return NextResponse.json({ data: updated, message: "Appointment updated." });
    }

    const parsed = appointmentSchema.partial().safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const data = parsed.data;
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(data.patientId !== undefined && { patientId: data.patientId }),
        ...(data.doctorId !== undefined && { doctorId: data.doctorId }),
        ...(data.roomId !== undefined && { roomId: data.roomId || null }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.startTime !== undefined && { startTime: data.startTime }),
        ...(data.endTime !== undefined && { endTime: data.endTime }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    if (data.treatmentIds !== undefined) {
      await prisma.appointmentTreatment.deleteMany({ where: { appointmentId: id } });
      if (data.treatmentIds.length > 0) {
        await prisma.appointmentTreatment.createMany({
          data: data.treatmentIds.map((tid) => ({ appointmentId: id, treatmentId: tid })),
        });
      }
    }

    await createAuditLog({
      userId: user!.id,
      action: "APPOINTMENT_UPDATED",
      entity: "Appointment",
      entityId: id,
      previousData: { status: existing.status, date: existing.date },
      newData: { status: updated.status, date: updated.date },
      req,
    });

    return NextResponse.json({ data: updated, message: "Appointment updated successfully." });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, user } = await requirePermission("appointments:delete");
  if (error) return error;

  try {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) return notFound("Appointment");

    await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await createAuditLog({
      userId: user!.id,
      action: "APPOINTMENT_CANCELLED",
      entity: "Appointment",
      entityId: id,
      req,
    });

    return NextResponse.json({ message: "Appointment cancelled." });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
