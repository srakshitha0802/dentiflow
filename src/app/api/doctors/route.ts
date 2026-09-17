import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, parsePaginationParams, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("doctors:read");
  if (error) return error;

  try {
    const { page, limit, skip } = parsePaginationParams(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { specialization: { contains: search } },
        { registrationNumber: { contains: search } },
      ];
    }

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: true,
          schedules: true,
          _count: { select: { appointments: true } },
        },
        orderBy: { user: { name: "asc" } },
      }),
      prisma.doctor.count({ where }),
    ]);

    return NextResponse.json({
      data: doctors,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    return serverError();
  }
}
