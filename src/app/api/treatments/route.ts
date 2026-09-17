import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, parsePaginationParams, createAuditLog, badRequest, serverError } from "@/lib/api-helpers";
import { treatmentSchema } from "@/lib/validations";
import { generateTreatmentId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("treatments:read");
  if (error) return error;

  try {
    const { page, limit, skip } = parsePaginationParams(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const categoryId = searchParams.get("categoryId") ?? "";
    const active = searchParams.get("active");

    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;
    if (active !== null) where.isActive = active === "true";
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [treatments, total, categories] = await Promise.all([
      prisma.treatment.findMany({
        where,
        skip,
        take: limit,
        include: { category: true, _count: { select: { appointmentTreatments: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.treatment.count({ where }),
      prisma.treatmentCategory.findMany({ orderBy: { name: "asc" } }),
    ]);

    return NextResponse.json({
      data: treatments,
      categories,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { error, user } = await requirePermission("treatments:write");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = treatmentSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));

    const data = parsed.data;
    const count = await prisma.treatment.count();
    const treatmentId = generateTreatmentId(count);

    const treatment = await prisma.treatment.create({
      data: {
        treatmentId,
        name: data.name,
        categoryId: data.categoryId || undefined,
        description: data.description,
        duration: data.duration,
        price: data.price,
        taxPercent: data.taxPercent,
        isActive: data.isActive,
      },
    });

    await createAuditLog({ userId: user!.id, action: "TREATMENT_CREATED", entity: "Treatment", entityId: treatment.id, req });
    return NextResponse.json({ data: treatment, message: "Treatment added successfully." }, { status: 201 });
  } catch (e) {
    return serverError();
  }
}
