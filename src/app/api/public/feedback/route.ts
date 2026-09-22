import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 12, 50);

    const feedbacks = await prisma.feedback.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        patientName: true,
        rating: true,
        category: true,
        comment: true,
        treatment: true,
        doctorName: true,
        createdAt: true,
      },
    });

    const allPublic = await prisma.feedback.findMany({
      where: { isPublic: true },
      select: { rating: true },
    });

    const total = allPublic.length;
    let averageRating = 5.0;
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (total > 0) {
      const sum = allPublic.reduce((acc, curr) => {
        distribution[curr.rating] = (distribution[curr.rating] || 0) + 1;
        return acc + curr.rating;
      }, 0);
      averageRating = Number((sum / total).toFixed(1));
    }

    const highRatings = (distribution[5] || 0) + (distribution[4] || 0);
    const satisfactionPercent = total > 0 ? Math.round((highRatings / total) * 100) : 99;

    return NextResponse.json({
      success: true,
      feedbacks,
      stats: {
        total,
        averageRating,
        satisfactionPercent,
        distribution,
      },
    });
  } catch (error) {
    console.error("Public feedback error:", error);
    return NextResponse.json(
      { error: "Failed to load testimonials" },
      { status: 500 }
    );
  }
}
