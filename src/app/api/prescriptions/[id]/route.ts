import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requirePermission,
  createAuditLog,
  notFound,
  serverError,
} from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requirePermission("clinical:read");
  if (error) return error;

  try {
    const rx = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        items: true,
        author: { select: { name: true } },
      },
    });

    if (!rx) return notFound("Prescription");
    return NextResponse.json({ data: rx });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, user } = await requirePermission("clinical:write");
  if (error) return error;

  try {
    const rx = await prisma.prescription.findUnique({ where: { id } });
    if (!rx) return notFound("Prescription");

    await prisma.prescription.delete({ where: { id } });

    await createAuditLog({
      userId: user!.id,
      action: "PRESCRIPTION_DELETED",
      entity: "Prescription",
      entityId: id,
      previousData: { prescriptionId: rx.prescriptionId },
      req,
    });

    return NextResponse.json({ message: "Prescription deleted successfully." });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
