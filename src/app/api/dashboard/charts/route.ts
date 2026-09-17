import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, serverError } from "@/lib/api-helpers";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("reports:read");
  if (error) return error;

  try {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      return format(d, "MMM d");
    });

    // Revenue by day (last 7 days)
    const payments = await prisma.payment.findMany({
      where: { date: { gte: subDays(today, 6) } },
      select: { amount: true, date: true },
    });

    const revenueByDay = last7Days.map((label, i) => {
      const d = subDays(today, 6 - i);
      const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
      const total = payments
        .filter((p) => new Date(p.date) >= dayStart && new Date(p.date) <= dayEnd)
        .reduce((sum, p) => sum + p.amount, 0);
      return { date: label, amount: total };
    });

    // Appointments by status this month
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const aptByStatus = await prisma.appointment.groupBy({
      by: ["status"],
      where: { date: { gte: monthStart, lte: monthEnd } },
      _count: { _all: true },
    });

    const appointmentsByStatus = aptByStatus.map((item) => ({
      name: item.status.replace(/_/g, " "),
      count: item._count._all,
    }));

    // Top treatments this month
    const topTreatments = await prisma.appointmentTreatment.groupBy({
      by: ["treatmentId"],
      _count: { _all: true },
      orderBy: { _count: { treatmentId: "desc" } },
      take: 5,
    });

    const treatmentNames = await prisma.treatment.findMany({
      where: { id: { in: topTreatments.map((t) => t.treatmentId) } },
      select: { id: true, name: true },
    });

    const topTreatmentsWithNames = topTreatments.map((t) => ({
      name: treatmentNames.find((tn) => tn.id === t.treatmentId)?.name ?? "Unknown",
      count: t._count._all,
    }));

    return NextResponse.json({
      revenueByDay,
      appointmentsByStatus,
      topTreatments: topTreatmentsWithNames,
    });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
