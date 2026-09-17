import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { reason } = body;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    }

    if (appointment.status === "COMPLETED" || appointment.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Cannot cancel an appointment that is already ${appointment.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CANCELLED",
        notes: reason ? `${appointment.notes || ""}\n[Cancelled by patient: ${reason}]` : appointment.notes,
      },
    });

    // Notify staff
    const staffUsers = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "RECEPTIONIST"] }, isActive: true },
      take: 3,
    });

    for (const staff of staffUsers) {
      await prisma.notification.create({
        data: {
          userId: staff.id,
          type: "APPOINTMENT_CANCELLED",
          title: "Appointment Cancelled by Patient",
          message: `${appointment.patient.firstName} ${appointment.patient.lastName} cancelled appointment (${appointment.appointmentId}). Reason: ${reason || "No reason provided"}`,
          link: "/appointments",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Appointment cancelled successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("Cancel appointment failed:", error);
    return NextResponse.json(
      { error: "Failed to cancel appointment." },
      { status: 500 }
    );
  }
}
