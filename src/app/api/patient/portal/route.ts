import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get("identifier")?.trim();

    if (!identifier) {
      return NextResponse.json(
        { error: "Please enter your Phone Number, Email, or Patient ID." },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.replace(/\s+/g, "");

    // Find patient by phone, email, or patientId
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { phone: cleanIdentifier },
          { email: identifier.toLowerCase() },
          { patientId: identifier.toUpperCase() },
        ],
      },
      include: {
        medicalHistory: true,
        emergencyContact: true,
        dentalInfo: true,
        appointments: {
          orderBy: { date: "desc" },
          include: {
            doctor: {
              include: {
                user: {
                  select: { name: true, phone: true, avatar: true },
                },
              },
            },
            treatments: {
              include: {
                treatment: true,
              },
            },
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                total: true,
                status: true,
                balanceDue: true,
              },
            },
          },
        },
        invoices: {
          orderBy: { invoiceDate: "desc" },
          include: {
            items: {
              include: { treatment: true },
            },
            payments: {
              orderBy: { date: "desc" },
            },
            doctor: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
        prescriptions: {
          orderBy: { date: "desc" },
          include: {
            doctor: {
              include: {
                user: { select: { name: true } },
              },
            },
            items: true,
          },
        },
        treatmentPlans: {
          orderBy: { createdAt: "desc" },
          include: {
            doctor: {
              include: {
                user: { select: { name: true } },
              },
            },
            items: {
              include: { treatment: true },
            },
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        {
          error: "No patient record found with that identifier. Please check your phone number or book a new appointment.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        patientId: patient.patientId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
        email: patient.email,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        city: patient.city,
        state: patient.state,
        allergies: patient.medicalHistory?.allergies,
        medicalNotes: patient.medicalHistory?.notes,
        emergencyContact: patient.emergencyContact,
      },
      appointments: patient.appointments,
      invoices: patient.invoices,
      prescriptions: patient.prescriptions,
      treatmentPlans: patient.treatmentPlans,
    });
  } catch (error) {
    console.error("Patient portal lookup failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient records." },
      { status: 500 }
    );
  }
}
