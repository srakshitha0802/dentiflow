import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, parsePaginationParams, createAuditLog, badRequest, serverError } from "@/lib/api-helpers";
import { inventoryItemSchema, stockMovementSchema } from "@/lib/validations";
import { generateInventoryId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("inventory:read");
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePaginationParams(req);
    const status = searchParams.get("status") ?? "";
    const categoryId = searchParams.get("categoryId") ?? "";
    const search = searchParams.get("search") ?? "";
    const supplierId = searchParams.get("supplierId") ?? "";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { itemId: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          category: true,
          supplier: { select: { companyName: true } },
          _count: { select: { movements: true } },
        },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    // Inventory summary
    const summary = await prisma.inventoryItem.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

    const totalValue = await prisma.inventoryItem.aggregate({
      _sum: { purchasePrice: true },
    });

    return NextResponse.json({
      data: items,
      summary: {
        byStatus: summary,
        totalValue: totalValue._sum.purchasePrice ?? 0,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { error, user } = await requirePermission("inventory:write");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = inventoryItemSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const data = parsed.data;

    // Check duplicate SKU
    if (data.sku) {
      const dup = await prisma.inventoryItem.findFirst({ where: { sku: data.sku } });
      if (dup) return NextResponse.json({ error: "An item with this SKU already exists." }, { status: 409 });
    }

    const count = await prisma.inventoryItem.count();
    const itemId = generateInventoryId(count);
    const status =
      data.quantity === 0
        ? "OUT_OF_STOCK"
        : data.quantity <= data.minStockLevel
        ? "LOW_STOCK"
        : "IN_STOCK";

    const item = await prisma.inventoryItem.create({
      data: {
        itemId,
        name: data.name,
        categoryId: data.categoryId || undefined,
        sku: data.sku || undefined,
        supplierId: data.supplierId || undefined,
        batchNumber: data.batchNumber,
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        quantity: data.quantity,
        unit: data.unit,
        minStockLevel: data.minStockLevel,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        storageLocation: data.storageLocation,
        status,
      },
    });

    // Create initial stock movement if quantity > 0
    if (data.quantity > 0) {
      await prisma.stockMovement.create({
        data: {
          itemId: item.id,
          quantity: data.quantity,
          type: "PURCHASE",
          notes: "Initial stock",
          performedById: user!.id,
        },
      });
    }

    return NextResponse.json({ data: item, message: "Inventory item added successfully." }, { status: 201 });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
