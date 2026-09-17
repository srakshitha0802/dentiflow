import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const doctors = await prisma.doctor.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        schedules: {
          where: { isActive: true },
          orderBy: { dayOfWeek: "asc" },
        },
      },
    });

    const getDoctorImage = (name: string, defaultAvatar?: string | null) => {
      if (defaultAvatar) return defaultAvatar;
      if (name.includes("Ananya")) return "/images/doctor_ananya.jpg";
      if (name.includes("Arjun")) return "/images/doctor_arjun.jpg";
      if (name.includes("Priya")) return "/images/doctor_priya.jpg";
      return "/images/doctor_ananya.jpg";
    };

    return NextResponse.json({
      data: doctors.map((d) => ({
        id: d.id,
        name: d.user.name,
        qualification: d.qualification,
        specialization: d.specialization,
        bio: d.bio,
        avatar: getDoctorImage(d.user.name, d.user.avatar),
        schedules: d.schedules,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch public doctors:", error);
    return NextResponse.json({ error: "Failed to fetch doctors" }, { status: 500 });
  }
}
