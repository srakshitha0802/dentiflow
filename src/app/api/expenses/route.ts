import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, parsePaginationParams, createAuditLog, badRequest, serverError } from "@/lib/api-helpers";
import { expenseSchema } from "@/lib/validations";
import { generateExpenseId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("expenses:read");
  if (error) return error;

  try {
    const { page, limit, skip } = parsePaginationParams(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") ?? "";
    const startDate = searchParams.get("startDate") ?? "";
    const endDate = searchParams.get("endDate") ?? "";

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (startDate && endDate) where.date = { gte: new Date(startDate), lte: new Date(endDate) };

    const [expenses, total, summary] = await Promise.all([
      prisma.expense.findMany({
        where, skip, take: limit,
        include: { createdBy: { select: { name: true } } },
        orderBy: { date: "desc" },
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ _sum: { amount: true }, where }),
    ]);

    return NextResponse.json({
      data: expenses,
      totalAmount: summary._sum.amount ?? 0,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { error, user } = await requirePermission("expenses:write");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));

    const data = parsed.data;
    const count = await prisma.expense.count();
    const expenseId = generateExpenseId(count);

    const expense = await prisma.expense.create({
      data: { expenseId, category: data.category, description: data.description, amount: data.amount, date: new Date(data.date), method: data.method, vendor: data.vendor, notes: data.notes, createdById: user!.id },
    });

    await createAuditLog({ userId: user!.id, action: "EXPENSE_CREATED", entity: "Expense", entityId: expense.id, newData: { amount: expense.amount, category: expense.category }, req });
    return NextResponse.json({ data: expense, message: "Expense recorded." }, { status: 201 });
  } catch (e) {
    return serverError();
  }
}
