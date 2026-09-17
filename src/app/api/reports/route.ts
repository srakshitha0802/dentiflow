import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, parsePaginationParams, badRequest, serverError } from "@/lib/api-helpers";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("reports:read");
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "financial";
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : startOfMonth(new Date());
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : endOfMonth(new Date());

    if (type === "financial") {
      const [revenue, expenses, invoicesByStatus, paymentsByMethod] = await Promise.all([
        prisma.payment.aggregate({
          _sum: { amount: true },
          _count: { _all: true },
          where: { date: { gte: startDate, lte: endDate } },
        }),
        prisma.expense.aggregate({
          _sum: { amount: true },
          where: { date: { gte: startDate, lte: endDate } },
        }),
        prisma.invoice.groupBy({
          by: ["status"],
          _count: { _all: true },
          _sum: { total: true },
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.payment.groupBy({
          by: ["method"],
          _sum: { amount: true },
          _count: { _all: true },
          where: { date: { gte: startDate, lte: endDate } },
        }),
      ]);

      const totalRevenue = revenue._sum.amount ?? 0;
      const totalExpenses = expenses._sum.amount ?? 0;

      return NextResponse.json({
        type: "financial",
        period: { startDate, endDate },
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          totalPayments: revenue._count._all,
        },
        invoicesByStatus,
        paymentsByMethod,
      });
    }

    if (type === "appointments") {
      const [byStatus, byDoctor, daily] = await Promise.all([
        prisma.appointment.groupBy({
          by: ["status"],
          _count: { _all: true },
          where: { date: { gte: startDate, lte: endDate } },
        }),
        prisma.appointment.groupBy({
          by: ["doctorId"],
          _count: { _all: true },
          where: { date: { gte: startDate, lte: endDate } },
          orderBy: { _count: { doctorId: "desc" } },
          take: 10,
        }),
        prisma.appointment.count({ where: { date: { gte: startDate, lte: endDate } } }),
      ]);

      const doctorIds = byDoctor.map((d) => d.doctorId);
      const doctors = await prisma.doctor.findMany({
        where: { id: { in: doctorIds } },
        include: { user: { select: { name: true } } },
      });

      return NextResponse.json({
        type: "appointments",
        period: { startDate, endDate },
        summary: { total: daily, byStatus },
        byDoctor: byDoctor.map((d) => ({
          doctorName: doctors.find((doc) => doc.id === d.doctorId)?.user.name ?? "Unknown",
          count: d._count._all,
        })),
      });
    }

    if (type === "patients") {
      const [total, newPatients, byGender] = await Promise.all([
        prisma.patient.count({ where: { status: "ACTIVE" } }),
        prisma.patient.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
        prisma.patient.groupBy({ by: ["gender"], _count: { _all: true } }),
      ]);

      return NextResponse.json({
        type: "patients",
        period: { startDate, endDate },
        summary: { total, newPatients, byGender },
      });
    }

    return badRequest("Invalid report type. Use: financial, appointments, or patients.");
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
