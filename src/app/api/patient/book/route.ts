import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAppointmentId, generatePatientId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      phone,
      email,
      dateOfBirth,
      gender,
      notes,
      doctorId,
      treatmentIds,
      date,
      startTime,
      endTime,
      allergies,
      medicalConditions,
    } = body;

    // Validate essential fields
    if (!firstName || !lastName || !phone || !date || !startTime || !endTime || !doctorId) {
      return NextResponse.json(
        { error: "Please provide all required fields: name, phone, doctor, date, and time slot." },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim().replace(/\s+/g, "");
    const appointmentDate = new Date(date);
    appointmentDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Check for conflicting appointments for the selected doctor
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId,
        date: { gte: appointmentDate, lte: endOfDay },
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
        { error: "The selected time slot has just been booked by another patient. Please choose a different slot." },
        { status: 409 }
      );
    }

    // 2. Find or Create Patient
    let patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          ...(email ? [{ email: email.trim().toLowerCase() }] : []),
        ],
      },
      include: { medicalHistory: true },
    });

    if (!patient) {
      const patientCount = await prisma.patient.count();
      const patientId = generatePatientId(patientCount);

      patient = await prisma.patient.create({
        data: {
          patientId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: cleanPhone,
          email: email ? email.trim().toLowerCase() : null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date("1995-01-01"),
          gender: gender || "OTHER",
          medicalHistory: {
            create: {
              allergies: allergies || undefined,
              conditions: medicalConditions || undefined,
            },
          },
          dentalInfo: {
            create: {
              dentalConcerns: notes || undefined,
              treatmentConsent: true,
              privacyConsent: true,
            },
          },
          dentalChart: {
            create: {},
          },
        },
        include: { medicalHistory: true },
      });
    }

    // 3. Generate unique appointment ID
    const appointmentCount = await prisma.appointment.count();
    const appointmentId = generateAppointmentId(appointmentCount);

    // 4. Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        appointmentId,
        patientId: patient.id,
        doctorId,
        date: appointmentDate,
        startTime,
        endTime,
        status: "SCHEDULED",
        notes: notes || "Booked online by patient via website",
        treatments: treatmentIds && treatmentIds.length > 0
          ? {
              create: treatmentIds.map((tId: string) => ({
                treatmentId: tId,
              })),
            }
          : undefined,
      },
      include: {
        patient: {
          select: {
            id: true,
            patientId: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
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
        treatments: {
          include: {
            treatment: true,
          },
        },
      },
    });

    // 5. Create notification for receptionist / clinic staff
    const staffUsers = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "RECEPTIONIST"] },
        isActive: true,
      },
      take: 5,
    });

    for (const staff of staffUsers) {
      await prisma.notification.create({
        data: {
          userId: staff.id,
          type: "APPOINTMENT_UPCOMING",
          title: "New Online Booking",
          message: `${patient.firstName} ${patient.lastName} booked an appointment for ${date} at ${startTime} with ${appointment.doctor.user.name}.`,
          link: `/appointments`,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Appointment booked successfully!",
        data: {
          appointmentId: appointment.appointmentId,
          id: appointment.id,
          patient: appointment.patient,
          doctor: {
            name: appointment.doctor.user.name,
            specialization: appointment.doctor.specialization,
          },
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          status: appointment.status,
          treatments: appointment.treatments.map((t) => t.treatment.name),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Patient online booking failed:", error);
    return NextResponse.json(
      { error: "Failed to complete appointment booking. Please try again or call the clinic." },
      { status: 500 }
    );
  }
}
