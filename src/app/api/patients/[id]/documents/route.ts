import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const patient = await prisma.patient.findFirst({
      where: {
        OR: [{ id }, { patientId: id }],
      },
      select: { id: true, patientId: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    const documents = await prisma.patientDocument.findMany({
      where: {
        patientId: patient.id,
      },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      patient,
      documents,
    });
  } catch (error) {
    console.error("Failed to fetch documents for patient:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient documents" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    const patient = await prisma.patient.findFirst({
      where: {
        OR: [{ id }, { patientId: id }],
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentName = (formData.get("name") as string) || "Clinical Document";
    const documentType = (formData.get("type") as string) || "CLINICAL_RECORD";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "documents");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalExt = path.extname(file.name) || ".pdf";
    const sanitizedBase = path
      .basename(file.name, originalExt)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 40);
    const uniqueFilename = `${patient.patientId}_doc_${Date.now()}_${sanitizedBase}${originalExt}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    await writeFile(filePath, buffer);
    const publicUrl = `/uploads/documents/${uniqueFilename}`;

    const uploaderName = session?.user?.name
      ? `${session.user.name} (${session.user.role || "Staff"})`
      : "Clinic Staff";

    const document = await prisma.patientDocument.create({
      data: {
        patientId: patient.id,
        name: documentName.trim() || file.name,
        type: documentType,
        url: publicUrl,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        uploadedBy: uploaderName,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Document uploaded to patient record successfully",
      document,
    });
  } catch (error) {
    console.error("Clinical document upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");

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
      message: "Document removed successfully",
    });
  } catch (error) {
    console.error("Delete patient document error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
