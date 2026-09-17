import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateAppointmentId,
  generatePatientId,
  generateInvoiceNumber,
  generatePaymentId,
} from "@/lib/utils";

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
      dentalConcern,
      doctorId,
      treatmentIds,
      date,
      startTime,
      endTime,
      allergies,
      medicalConditions,
      paymentMethod,
      isPaid,
      transactionRef,
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
      include: { medicalHistory: true, dentalInfo: true },
    });

    const combinedConcern = [
      dentalConcern ? `Concern: ${dentalConcern}` : "",
      notes ? `Notes: ${notes}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

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
              dentalConcerns: combinedConcern || undefined,
              treatmentConsent: true,
              privacyConsent: true,
            },
          },
          dentalChart: {
            create: {},
          },
        },
        include: { medicalHistory: true, dentalInfo: true },
      });
    } else if (combinedConcern) {
      // Update existing patient dental info if needed
      await prisma.dentalInfo.upsert({
        where: { patientId: patient.id },
        update: { dentalConcerns: combinedConcern },
        create: {
          patientId: patient.id,
          dentalConcerns: combinedConcern,
          treatmentConsent: true,
          privacyConsent: true,
        },
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
        notes: combinedConcern || "Booked online by patient via DentiFlow website",
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
                id: true,
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

    // 5. Calculate Itemized Pricing & Generate Official Tax Invoice
    const selectedTreatments = treatmentIds && treatmentIds.length > 0
      ? await prisma.treatment.findMany({ where: { id: { in: treatmentIds } } })
      : [];

    const consultationFee = 500;
    const proceduresSubtotal = selectedTreatments.reduce(
      (sum, t) => sum + (t.price || 0),
      0
    );
    const subtotal = consultationFee + proceduresSubtotal;
    const taxPercent = 18;
    const taxAmount = Math.round(subtotal * (taxPercent / 100));
    const total = subtotal + taxAmount;
    const paidAmount = isPaid ? total : 0;
    const balanceDue = isPaid ? 0 : total;
    const invoiceStatus = isPaid ? "PAID" : "UNPAID";

    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = generateInvoiceNumber(invoiceCount);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        patientId: patient.id,
        doctorId,
        appointmentId: appointment.id,
        dueDate: appointmentDate,
        subtotal,
        discountType: "NONE",
        discountValue: 0,
        discountAmount: 0,
        taxPercent,
        taxAmount,
        total,
        amountPaid: paidAmount,
        balanceDue,
        status: invoiceStatus,
        notes: `Appointment: ${appointment.appointmentId} | ${combinedConcern || "Routine visit"}`,
        items: {
          create: [
            {
              description: "Doctor Consultation & Diagnostic Checkup",
              quantity: 1,
              unitPrice: consultationFee,
              tax: Math.round(consultationFee * 0.18),
              amount: consultationFee,
            },
            ...selectedTreatments.map((t) => ({
              treatmentId: t.id,
              description: t.name,
              quantity: 1,
              unitPrice: t.price,
              tax: Math.round(t.price * 0.18),
              amount: t.price,
            })),
          ],
        },
      },
      include: {
        items: true,
      },
    });

    // 6. Record Payment if Patient Paid Online
    let paymentRecord: any = null;
    if (isPaid) {
      const adminUser = await prisma.user.findFirst({
        where: { role: "ADMIN" },
      });
      const paymentCount = await prisma.payment.count();
      const paymentId = generatePaymentId(paymentCount);

      paymentRecord = await prisma.payment.create({
        data: {
          paymentId,
          invoiceId: invoice.id,
          patientId: patient.id,
          amount: total,
          method: paymentMethod === "CARD" ? "CARD" : "UPI",
          referenceNumber:
            transactionRef ||
            `${paymentMethod || "UPI"}-${Date.now().toString().slice(-6)}`,
          notes: `Instant Online Pre-Payment for ${appointment.appointmentId}`,
          recordedById: adminUser?.id || appointment.doctor.user.id,
        },
      });
    }

    // 7. Create notification for clinic staff
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
          title: "New Online Booking & Bill Generated",
          message: `${patient.firstName} ${patient.lastName} booked for ${date} at ${startTime} with ${appointment.doctor.user.name}. Bill: ${invoice.invoiceNumber} (${invoiceStatus}).`,
          link: `/appointments`,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Appointment booked and tax invoice generated successfully!",
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
          dentalConcern: combinedConcern,
          treatments: appointment.treatments.map((t) => t.treatment.name),
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            subtotal: invoice.subtotal,
            taxPercent: invoice.taxPercent,
            taxAmount: invoice.taxAmount,
            total: invoice.total,
            amountPaid: invoice.amountPaid,
            balanceDue: invoice.balanceDue,
            status: invoice.status,
            items: invoice.items,
          },
          payment: paymentRecord
            ? {
                paymentId: paymentRecord.paymentId,
                amount: paymentRecord.amount,
                method: paymentRecord.method,
                referenceNumber: paymentRecord.referenceNumber,
                date: paymentRecord.date,
              }
            : null,
          clinic: {
            name: "DentiFlow Dental Care Clinic",
            address: "12, Rajpath Avenue, Near City Square, Bengaluru, Karnataka - 560001",
            phone: "080-46001234",
            email: "care@dentiflow.com",
            gstin: "29ABCDE1234F1ZX",
          },
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
