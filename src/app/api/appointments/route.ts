import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, createAuditLog, badRequest, serverError } from "@/lib/api-helpers";
import { appointmentSchema } from "@/lib/validations";
import { generateAppointmentId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("appointments:read");
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId") ?? "";
    const status = searchParams.get("status") ?? "";
    const dateStr = searchParams.get("date") ?? "";
    const startDate = searchParams.get("startDate") ?? "";
    const endDate = searchParams.get("endDate") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    if (dateStr === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endToday = new Date();
      endToday.setHours(23, 59, 59, 999);
      where.date = { gte: today, lte: endToday };
    } else if (dateStr) {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      const de = new Date(dateStr);
      de.setHours(23, 59, 59, 999);
      where.date = { gte: d, lte: de };
    } else if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        include: {
          patient: { select: { id: true, patientId: true, firstName: true, lastName: true, phone: true } },
          doctor: { include: { user: { select: { name: true, email: true } } } },
          room: true,
          treatments: { include: { treatment: true } },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return NextResponse.json({
      data: appointments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { error, user } = await requirePermission("appointments:write");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = appointmentSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const data = parsed.data;
    const appointmentDate = new Date(data.date);
    appointmentDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(data.date);
    endOfDay.setHours(23, 59, 59, 999);

    // Check for doctor conflicts (server-side)
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId: data.doctorId,
        date: { gte: appointmentDate, lte: endOfDay },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        OR: [
          {
            AND: [
              { startTime: { lte: data.startTime } },
              { endTime: { gt: data.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: data.endTime } },
              { endTime: { gte: data.endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: data.startTime } },
              { endTime: { lte: data.endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingAppointment) {
      return NextResponse.json(
        {
          error: `Doctor already has an appointment from ${conflictingAppointment.startTime} to ${conflictingAppointment.endTime}. Please choose a different time.`,
        },
        { status: 409 }
      );
    }

    // Check room conflicts if room is specified
    if (data.roomId) {
      const roomConflict = await prisma.appointment.findFirst({
        where: {
          roomId: data.roomId,
          date: { gte: appointmentDate, lte: endOfDay },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          OR: [
            { AND: [{ startTime: { lte: data.startTime } }, { endTime: { gt: data.startTime } }] },
            { AND: [{ startTime: { lt: data.endTime } }, { endTime: { gte: data.endTime } }] },
            { AND: [{ startTime: { gte: data.startTime } }, { endTime: { lte: data.endTime } }] },
          ],
        },
      });
      if (roomConflict) {
        return NextResponse.json(
          { error: "This room is already booked for the selected time slot." },
          { status: 409 }
        );
      }
    }

    const count = await prisma.appointment.count();
    const appointmentId = generateAppointmentId(count);

    const appointment = await prisma.appointment.create({
      data: {
        appointmentId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        roomId: data.roomId || undefined,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        notes: data.notes,
        treatments: data.treatmentIds?.length
          ? { create: data.treatmentIds.map((tid) => ({ treatmentId: tid })) }
          : undefined,
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        doctor: { include: { user: { select: { name: true } } } },
      },
    });

    await createAuditLog({
      userId: user!.id,
      action: "APPOINTMENT_CREATED",
      entity: "Appointment",
      entityId: appointment.id,
      newData: { appointmentId: appointment.appointmentId, date: data.date, status: data.status },
      req,
    });

    return NextResponse.json(
      { data: appointment, message: "Appointment booked successfully." },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return serverError("Unable to book appointment. Please try again.");
  }
}
