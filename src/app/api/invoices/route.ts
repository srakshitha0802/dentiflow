import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, createAuditLog, parsePaginationParams, badRequest, serverError } from "@/lib/api-helpers";
import { invoiceSchema } from "@/lib/validations";
import { generateInvoiceNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("billing:read");
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePaginationParams(req);
    const status = searchParams.get("status") ?? "";
    const patientId = searchParams.get("patientId") ?? "";
    const search = searchParams.get("search") ?? "";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { patient: { firstName: { contains: search, mode: "insensitive" } } },
        { patient: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: { id: true, patientId: true, firstName: true, lastName: true, phone: true } },
          doctor: { include: { user: { select: { name: true } } } },
          items: true,
          _count: { select: { payments: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      data: invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { error, user } = await requirePermission("billing:write");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const data = parsed.data;

    // Calculate totals on the backend (never trust frontend)
    const itemTotals = data.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const discountAmt = item.discount ?? 0;
      const taxAmt = item.tax ?? 0;
      return {
        ...item,
        amount: lineTotal - discountAmt + taxAmt,
      };
    });

    const subtotal = itemTotals.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    let discountAmount = 0;
    if (data.discountType === "PERCENTAGE") {
      discountAmount = (subtotal * data.discountValue) / 100;
    } else if (data.discountType === "FIXED") {
      discountAmount = data.discountValue;
    }

    const taxAmount = ((subtotal - discountAmount) * data.taxPercent) / 100;
    const total = subtotal - discountAmount + taxAmount;
    const balanceDue = total; // No payment yet

    const count = await prisma.invoice.count();
    const settings = await prisma.clinicSetting.findUnique({ where: { key: "invoicePrefix" } });
    const invoiceNumber = generateInvoiceNumber(count, settings?.value ?? "INV");

    // Check if appointment already has an invoice
    if (data.appointmentId) {
      const existingInv = await prisma.invoice.findUnique({ where: { appointmentId: data.appointmentId } });
      if (existingInv) {
        return NextResponse.json({ error: "An invoice already exists for this appointment." }, { status: 409 });
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        patientId: data.patientId,
        doctorId: data.doctorId || undefined,
        appointmentId: data.appointmentId || undefined,
        dueDate: new Date(data.dueDate),
        subtotal,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountAmount,
        taxPercent: data.taxPercent,
        taxAmount,
        total,
        balanceDue,
        status: "UNPAID",
        notes: data.notes,
        items: {
          create: itemTotals.map((item) => ({
            treatmentId: item.treatmentId || undefined,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount ?? 0,
            tax: item.tax ?? 0,
            amount: item.amount,
          })),
        },
      },
      include: { items: true, patient: { select: { firstName: true, lastName: true } } },
    });

    await createAuditLog({
      userId: user!.id,
      action: "INVOICE_CREATED",
      entity: "Invoice",
      entityId: invoice.id,
      newData: { invoiceNumber: invoice.invoiceNumber, total: invoice.total },
      req,
    });

    return NextResponse.json({ data: invoice, message: "Invoice created successfully." }, { status: 201 });
  } catch (e) {
    console.error(e);
    return serverError("Unable to create invoice. Please try again.");
  }
}
