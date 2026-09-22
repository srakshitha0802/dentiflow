import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get("identifier")?.trim();
    const patientIdParam = searchParams.get("patientId")?.trim();

    if (!identifier && !patientIdParam) {
      return NextResponse.json(
        { error: "Patient identifier required" },
        { status: 400 }
      );
    }

    let targetPatientId = patientIdParam;

    if (!targetPatientId && identifier) {
      const cleanIdentifier = identifier.replace(/\s+/g, "");
      const digitsOnly = identifier.replace(/\D/g, "");
      const last10Digits = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
      const phoneMatches = Array.from(new Set([
        cleanIdentifier,
        digitsOnly,
        last10Digits,
        `+91${last10Digits}`,
        `+91 ${last10Digits}`,
        `0${last10Digits}`
      ].filter(Boolean)));

      const patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { phone: { in: phoneMatches } },
            { email: identifier.toLowerCase() },
            { patientId: identifier.toUpperCase() },
          ],
        },
        select: { id: true },
      });

      if (patient) {
        targetPatientId = patient.id;
      }
    }

    const feedbacks = await prisma.feedback.findMany({
      where: targetPatientId
        ? {
            OR: [
              { patientId: targetPatientId },
              { patientPhone: identifier?.replace(/\s+/g, "") },
            ],
          }
        : {
            patientPhone: identifier?.replace(/\s+/g, ""),
          },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, feedbacks });
  } catch (error) {
    console.error("Fetch patient feedback error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedbacks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      identifier,
      patientId,
      patientName,
      patientPhone,
      rating,
      category,
      comment,
      treatment,
      doctorId,
      doctorName,
    } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Please select a star rating between 1 and 5." },
        { status: 400 }
      );
    }

    if (!comment || comment.trim().length < 5) {
      return NextResponse.json(
        { error: "Please write a brief feedback comment (at least 5 characters)." },
        { status: 400 }
      );
    }

    // Resolve patient record if available
    let resolvedPatientId = patientId || null;
    let resolvedPatientName = patientName || "Verified Patient";
    let resolvedPatientPhone = patientPhone || null;

    if (!resolvedPatientId && identifier) {
      const cleanIdentifier = identifier.replace(/\s+/g, "");
      const digitsOnly = identifier.replace(/\D/g, "");
      const last10Digits = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
      const phoneMatches = Array.from(new Set([
        cleanIdentifier,
        digitsOnly,
        last10Digits,
        `+91${last10Digits}`,
        `+91 ${last10Digits}`,
        `0${last10Digits}`
      ].filter(Boolean)));

      const patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { phone: { in: phoneMatches } },
            { email: identifier.toLowerCase() },
            { patientId: identifier.toUpperCase() },
          ],
        },
      });

      if (patient) {
        resolvedPatientId = patient.id;
        resolvedPatientName = `${patient.firstName} ${patient.lastName}`;
        resolvedPatientPhone = patient.phone;
      } else {
        resolvedPatientPhone = cleanIdentifier;
      }
    }

    // Resolve doctor name if doctorId provided and doctorName is missing
    let resolvedDoctorName = doctorName || null;
    if (doctorId && !resolvedDoctorName) {
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        include: { user: { select: { name: true } } },
      });
      if (doctor) {
        resolvedDoctorName = doctor.user.name;
      }
    }

    const feedback = await prisma.feedback.create({
      data: {
        patientId: resolvedPatientId,
        patientName: resolvedPatientName,
        patientPhone: resolvedPatientPhone,
        rating: Number(rating),
        category: category || "GENERAL",
        comment: comment.trim(),
        treatment: treatment?.trim() || null,
        doctorId: doctorId || null,
        doctorName: resolvedDoctorName,
        isPublic: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Thank you for your valuable feedback! It has been recorded.",
      feedback,
    });
  } catch (error) {
    console.error("Patient feedback submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback. Please try again." },
      { status: 500 }
    );
  }
}
