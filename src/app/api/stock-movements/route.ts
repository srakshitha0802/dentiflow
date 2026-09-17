import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, createAuditLog, badRequest, serverError } from "@/lib/api-helpers";
import { stockMovementSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("inventory:read");
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (itemId) where.itemId = itemId;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          item: { select: { name: true, itemId: true, unit: true } },
          performedBy: { select: { name: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return NextResponse.json({
      data: movements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { error, user } = await requirePermission("inventory:write");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = stockMovementSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const data = parsed.data;

    const item = await prisma.inventoryItem.findUnique({ where: { id: data.itemId } });
    if (!item) return badRequest("Inventory item not found.");

    // Calculate new quantity based on movement type
    const isDeduction = ["CONSUMPTION", "EXPIRY", "DAMAGED", "RETURN"].includes(data.type);
    const quantityChange = isDeduction ? -data.quantity : data.quantity;
    const newQuantity = item.quantity + quantityChange;

    if (newQuantity < 0) {
      return badRequest(`Cannot remove ${data.quantity} ${item.unit}(s). Only ${item.quantity} available.`);
    }

    const newStatus =
      newQuantity === 0
        ? "OUT_OF_STOCK"
        : newQuantity <= item.minStockLevel
        ? "LOW_STOCK"
        : "IN_STOCK";

    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          itemId: data.itemId,
          quantity: isDeduction ? -data.quantity : data.quantity,
          type: data.type,
          reference: data.reference,
          notes: data.notes,
          performedById: user!.id,
        },
      });

      const updatedItem = await tx.inventoryItem.update({
        where: { id: data.itemId },
        data: {
          quantity: newQuantity,
          status: newStatus,
        },
      });

      return { movement, item: updatedItem };
    });

    await createAuditLog({
      userId: user!.id,
      action: "STOCK_MOVEMENT",
      entity: "InventoryItem",
      entityId: data.itemId,
      previousData: { quantity: item.quantity },
      newData: { quantity: newQuantity, movementType: data.type },
      req,
    });

    // Create low-stock notification if needed
    if (newStatus === "LOW_STOCK" && item.status !== "LOW_STOCK") {
      await prisma.notification.create({
        data: {
          userId: user!.id,
          type: "LOW_INVENTORY",
          title: "Low Stock Alert",
          message: `${item.name} is running low. Only ${newQuantity} ${item.unit}(s) remaining (minimum: ${item.minStockLevel}).`,
          link: `/inventory/${item.id}`,
        },
      });
    }

    return NextResponse.json({ data: result, message: "Stock movement recorded successfully." }, { status: 201 });
  } catch (e) {
    console.error(e);
    return serverError("Unable to record stock movement. Please try again.");
  }
}
