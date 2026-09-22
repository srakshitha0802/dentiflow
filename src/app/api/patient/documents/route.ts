import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get("identifier")?.trim();
    const patientId = searchParams.get("patientId")?.trim();

    if (!identifier && !patientId) {
      return NextResponse.json(
        { error: "Patient identifier or ID is required" },
        { status: 400 }
      );
    }

    let targetPatientId = patientId;

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

      if (!patient) {
        return NextResponse.json(
          { error: "Patient not found" },
          { status: 404 }
        );
      }
      targetPatientId = patient.id;
    }

    const documents = await prisma.patientDocument.findMany({
      where: {
        patientId: targetPatientId,
        isArchived: false,
      },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error("Failed to fetch patient documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const identifier = formData.get("identifier") as string | null;
    const patientIdParam = formData.get("patientId") as string | null;
    const documentName = (formData.get("name") as string) || "Medical Document";
    const documentType = (formData.get("type") as string) || "PREVIOUS_RECORD";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided for upload" },
        { status: 400 }
      );
    }

    if (!identifier && !patientIdParam) {
      return NextResponse.json(
        { error: "Patient identification is required" },
        { status: 400 }
      );
    }

    // Resolve patient record
    let patient = null;
    if (patientIdParam) {
      patient = await prisma.patient.findUnique({
        where: { id: patientIdParam },
      });
    }

    if (!patient && identifier) {
      const cleanIdentifier = identifier.trim().replace(/\s+/g, "");
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

      patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { phone: { in: phoneMatches } },
            { email: identifier.trim().toLowerCase() },
            { patientId: identifier.trim().toUpperCase() },
          ],
        },
      });
    }

    if (!patient) {
      return NextResponse.json(
        { error: "Patient record not found. Please log in first." },
        { status: 404 }
      );
    }

    // Prepare upload directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", "documents");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate safe unique filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalExt = path.extname(file.name) || ".pdf";
    const sanitizedBase = path
      .basename(file.name, originalExt)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 40);
    const uniqueFilename = `${patient.patientId}_${Date.now()}_${sanitizedBase}${originalExt}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    // Save to disk
    await writeFile(filePath, buffer);
    const publicUrl = `/uploads/documents/${uniqueFilename}`;

    // Create database record
    const document = await prisma.patientDocument.create({
      data: {
        patientId: patient.id,
        name: documentName.trim() || file.name,
        type: documentType,
        url: publicUrl,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        uploadedBy: "Patient (Self Upload)",
      },
    });

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      document,
    });
  } catch (error) {
    console.error("Patient file upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    await prisma.patientDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
