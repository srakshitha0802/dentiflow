import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, createAuditLog, badRequest, notFound, serverError } from "@/lib/api-helpers";
import { paymentSchema } from "@/lib/validations";
import { generatePaymentId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("payments:read");
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;
    const patientId = searchParams.get("patientId") ?? "";
    const method = searchParams.get("method") ?? "";
    const search = searchParams.get("search") ?? "";

    const where: Record<string, unknown> = {};
    if (patientId) where.patientId = patientId;
    if (method) where.method = method;
    if (search) {
      where.OR = [
        { paymentId: { contains: search } },
        { referenceNumber: { contains: search } },
        { patient: { firstName: { contains: search } } },
        { patient: { lastName: { contains: search } } },
        { invoice: { invoiceNumber: { contains: search } } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, patientId: true } },
          invoice: { select: { invoiceNumber: true, total: true } },
          recordedBy: { select: { name: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      data: payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { error, user } = await requirePermission("payments:write");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const data = parsed.data;

    // Fetch invoice to validate balance
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { patient: true },
    });
    if (!invoice) return notFound("Invoice");
    if (invoice.status === "CANCELLED") {
      return badRequest("Cannot record payment on a cancelled invoice.");
    }
    if (invoice.status === "PAID") {
      return badRequest("Invoice is already fully paid.");
    }

    // Validate amount does not exceed balance (unless overpayment is intentional)
    if (data.amount > invoice.balanceDue + 0.01) {
      return badRequest(
        `Payment amount (₹${data.amount}) exceeds the outstanding balance (₹${invoice.balanceDue.toFixed(2)}).`
      );
    }

    // Use a transaction to safely update invoice balance
    const count = await prisma.payment.count();
    const paymentId = generatePaymentId(count);

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          paymentId,
          invoiceId: data.invoiceId,
          patientId: invoice.patientId,
          amount: data.amount,
          method: data.method,
          referenceNumber: data.referenceNumber,
          date: data.date ? new Date(data.date) : new Date(),
          notes: data.notes,
          recordedById: user!.id,
        },
      });

      const newAmountPaid = invoice.amountPaid + data.amount;
      const newBalance = invoice.total - newAmountPaid;
      const newStatus =
        newBalance <= 0.01
          ? "PAID"
          : newAmountPaid > 0
          ? "PARTIALLY_PAID"
          : "UNPAID";

      const updatedInvoice = await tx.invoice.update({
        where: { id: data.invoiceId },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: Math.max(0, newBalance),
          status: newStatus,
        },
      });

      return { payment, invoice: updatedInvoice };
    });

    await createAuditLog({
      userId: user!.id,
      action: "PAYMENT_RECORDED",
      entity: "Payment",
      entityId: result.payment.id,
      newData: {
        paymentId: result.payment.paymentId,
        amount: result.payment.amount,
        method: result.payment.method,
        invoiceStatus: result.invoice.status,
      },
      req,
    });

    return NextResponse.json(
      { data: result.payment, message: "Payment recorded successfully." },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return serverError("Unable to record payment. Please try again.");
  }
}
