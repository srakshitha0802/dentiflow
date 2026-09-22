import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const rating = searchParams.get("rating") ? Number(searchParams.get("rating")) : undefined;
    const category = searchParams.get("category")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit")) || 15));
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { patientName: { contains: search } },
        { comment: { contains: search } },
        { treatment: { contains: search } },
        { doctorName: { contains: search } },
      ];
    }

    if (rating && !isNaN(rating)) {
      whereClause.rating = rating;
    }

    if (category && category !== "ALL") {
      whereClause.category = category;
    }

    const [feedbacks, total, allFeedbacks] = await Promise.all([
      prisma.feedback.findMany({
        where: whereClause,
        include: {
          patient: {
            select: { id: true, patientId: true, firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.feedback.count({ where: whereClause }),
      prisma.feedback.findMany({
        select: { rating: true, isPublic: true },
      }),
    ]);

    // Aggregate stats
    const totalCount = allFeedbacks.length;
    let avgRating = 0;
    const ratingBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalCount > 0) {
      const sum = allFeedbacks.reduce((acc, curr) => {
        ratingBreakdown[curr.rating] = (ratingBreakdown[curr.rating] || 0) + 1;
        return acc + curr.rating;
      }, 0);
      avgRating = Number((sum / totalCount).toFixed(1));
    }

    const positiveCount = (ratingBreakdown[5] || 0) + (ratingBreakdown[4] || 0);
    const satisfactionRate = totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 100;

    return NextResponse.json({
      success: true,
      data: feedbacks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        totalFeedbacks: totalCount,
        averageRating: avgRating,
        satisfactionRate,
        ratingBreakdown,
        publicCount: allFeedbacks.filter((f) => f.isPublic).length,
      },
    });
  } catch (error) {
    console.error("Dashboard feedback list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedbacks" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isPublic } = body;

    if (!id) {
      return NextResponse.json({ error: "Feedback ID is required" }, { status: 400 });
    }

    const updated = await prisma.feedback.update({
      where: { id },
      data: {
        isPublic: typeof isPublic === "boolean" ? isPublic : true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Feedback visibility updated",
      feedback: updated,
    });
  } catch (error) {
    console.error("Toggle feedback public error:", error);
    return NextResponse.json(
      { error: "Failed to update feedback" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Feedback ID is required" }, { status: 400 });
    }

    await prisma.feedback.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (error) {
    console.error("Delete feedback error:", error);
    return NextResponse.json(
      { error: "Failed to delete feedback" },
      { status: 500 }
    );
  }
}
