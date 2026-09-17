import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePaymentId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, amount, method, referenceNumber, notes } = body;

    if (!invoiceId || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Invalid payment details. Amount must be greater than zero." },
        { status: 400 }
      );
    }

    const payAmount = Number(amount);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        patient: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    if (invoice.status === "PAID") {
      return NextResponse.json({ error: "This invoice is already paid in full." }, { status: 400 });
    }

    if (payAmount > invoice.balanceDue + 0.5) {
      return NextResponse.json(
        { error: `Payment amount (₹${payAmount}) exceeds the balance due (₹${invoice.balanceDue}).` },
        { status: 400 }
      );
    }

    // Find system user or admin to record online payment
    const systemUser =
      (await prisma.user.findFirst({
        where: { role: { in: ["ADMIN", "ACCOUNTANT"] } },
      })) || (await prisma.user.findFirst());

    if (!systemUser) {
      return NextResponse.json({ error: "System configuration error." }, { status: 500 });
    }

    const payCount = await prisma.payment.count();
    const paymentId = generatePaymentId(payCount);

    const newAmountPaid = invoice.amountPaid + payAmount;
    const newBalanceDue = Math.max(0, invoice.total - newAmountPaid);
    const newStatus = newBalanceDue <= 0.01 ? "PAID" : "PARTIALLY_PAID";

    // Run transaction
    const [payment, updatedInvoice] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          paymentId,
          invoiceId: invoice.id,
          patientId: invoice.patientId,
          amount: payAmount,
          method: method || "UPI",
          referenceNumber: referenceNumber || `ONLINE-${Date.now().toString().slice(-6)}`,
          notes: notes || "Patient online payment via patient portal",
          recordedById: systemUser.id,
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          status: newStatus,
        },
        include: {
          items: true,
          patient: true,
        },
      }),
    ]);

    // Create notification for accountant / admin
    const adminStaff = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "ACCOUNTANT"] }, isActive: true },
      take: 3,
    });

    for (const admin of adminStaff) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "PAYMENT_RECEIVED",
          title: "Online Payment Received",
          message: `₹${payAmount} received online from ${invoice.patient.firstName} ${invoice.patient.lastName} for ${invoice.invoiceNumber}.`,
          link: "/invoices",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${payAmount} processed successfully!`,
      payment,
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error("Online payment failed:", error);
    return NextResponse.json(
      { error: "Payment processing failed. Please try again or contact the clinic." },
      { status: 500 }
    );
  }
}
