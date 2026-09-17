import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { date, startTime, endTime, reason } = body;

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Date, start time, and end time are required for rescheduling." },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: {
          include: { user: true },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    }

    if (appointment.status === "COMPLETED" || appointment.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Cannot reschedule an appointment that is already ${appointment.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Check doctor conflict
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        id: { not: appointment.id },
        doctorId: appointment.doctorId,
        date: { gte: targetDate, lte: endOfDay },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingAppointment) {
      return NextResponse.json(
        { error: "The doctor is already booked for the selected time slot. Please choose another slot." },
        { status: 409 }
      );
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        date: targetDate,
        startTime,
        endTime,
        status: "SCHEDULED",
        notes: reason ? `${appointment.notes || ""}\n[Rescheduled by patient: ${reason}]` : appointment.notes,
      },
      include: {
        doctor: { include: { user: true } },
        patient: true,
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
          type: "APPOINTMENT_UPCOMING",
          title: "Appointment Rescheduled",
          message: `${appointment.patient.firstName} ${appointment.patient.lastName} rescheduled appointment (${appointment.appointmentId}) to ${date} at ${startTime}.`,
          link: "/appointments",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Appointment rescheduled successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("Reschedule failed:", error);
    return NextResponse.json(
      { error: "Failed to reschedule appointment." },
      { status: 500 }
    );
  }
}
