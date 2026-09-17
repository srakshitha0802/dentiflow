import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const categories = await prisma.treatmentCategory.findMany({
      include: {
        treatments: {
          where: { isActive: true },
          orderBy: { price: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const allTreatments = await prisma.treatment.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      categories,
      treatments: allTreatments,
    });
  } catch (error) {
    console.error("Failed to fetch public treatments:", error);
    return NextResponse.json({ error: "Failed to fetch treatments" }, { status: 500 });
  }
}
