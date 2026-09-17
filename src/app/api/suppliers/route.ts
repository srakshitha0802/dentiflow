import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, parsePaginationParams, createAuditLog, badRequest, serverError } from "@/lib/api-helpers";
import { supplierSchema } from "@/lib/validations";
import { generateSupplierId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("inventory:read");
  if (error) return error;

  try {
    const { page, limit, skip } = parsePaginationParams(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contactPerson: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where, skip, take: limit,
        include: { _count: { select: { inventoryItems: true, purchaseOrders: true } } },
        orderBy: { companyName: "asc" },
      }),
      prisma.supplier.count({ where }),
    ]);

    return NextResponse.json({ data: suppliers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { error, user } = await requirePermission("inventory:write");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));

    const data = parsed.data;
    const count = await prisma.supplier.count();
    const supplierId = generateSupplierId(count);

    const supplier = await prisma.supplier.create({
      data: { supplierId, companyName: data.companyName, contactPerson: data.contactPerson, phone: data.phone, email: data.email || undefined, address: data.address, taxId: data.taxId, paymentTerms: data.paymentTerms, status: data.status },
    });

    await createAuditLog({ userId: user!.id, action: "SUPPLIER_CREATED", entity: "Supplier", entityId: supplier.id, req });
    return NextResponse.json({ data: supplier, message: "Supplier added." }, { status: 201 });
  } catch (e) {
    return serverError();
  }
}
