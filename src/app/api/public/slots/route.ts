import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const doctorId = searchParams.get("doctorId");
    const duration = parseInt(searchParams.get("duration") || "30", 10);

    if (!dateStr) {
      return NextResponse.json({ error: "Date parameter is required (YYYY-MM-DD)" }, { status: 400 });
    }

    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);

    // Convert JS day (0=Sunday..6=Saturday) to schedule day (1=Monday..6=Saturday, 7=Sunday)
    const jsDay = targetDate.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    // Fetch doctors to check
    const doctors = await prisma.doctor.findMany({
      where: {
        isActive: true,
        ...(doctorId ? { id: doctorId } : {}),
      },
      include: {
        user: { select: { name: true } },
        schedules: {
          where: {
            dayOfWeek: dayOfWeek,
            isActive: true,
          },
        },
      },
    });

    if (doctors.length === 0) {
      return NextResponse.json({ slots: [], message: "No doctors available" });
    }

    // Query all existing appointments on targetDate for these doctors
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: { in: doctors.map((d) => d.id) },
        date: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      select: {
        doctorId: true,
        startTime: true,
        endTime: true,
      },
    });

    const clinicStart = 9 * 60; // 09:00 AM
    const clinicEnd = 18 * 60; // 06:00 PM
    const lunchStart = 13 * 60; // 01:00 PM
    const lunchEnd = 14 * 60; // 02:00 PM

    const slots: Array<{
      time: string;
      startTime: string;
      endTime: string;
      available: boolean;
      isAvailable: boolean;
      availableDoctorIds: string[];
      availableDoctors: Array<{ id: string; name: string }>;
    }> = [];

    // Generate slots in increments of duration (default 30 min)
    const slotStep = Math.min(Math.max(duration, 15), 60);

    for (let cur = clinicStart; cur + duration <= clinicEnd; cur += slotStep) {
      // Skip lunch break
      if (cur >= lunchStart && cur < lunchEnd) continue;

      const slotStartStr = minutesToTime(cur);
      const slotEndStr = minutesToTime(cur + duration);
      const slotStartMin = cur;
      const slotEndMin = cur + duration;

      const availableDocs: Array<{ id: string; name: string }> = [];

      for (const doctor of doctors) {
        // Check if doctor works today
        const worksToday = doctor.schedules.some((sch) => {
          const schStart = timeToMinutes(sch.startTime);
          const schEnd = timeToMinutes(sch.endTime);
          return slotStartMin >= schStart && slotEndMin <= schEnd;
        });

        if (!worksToday && doctor.schedules.length > 0) continue;

        // Check if doctor has conflicting appointment
        const hasConflict = existingAppointments.some((apt) => {
          if (apt.doctorId !== doctor.id) return false;
          const aptStart = timeToMinutes(apt.startTime);
          const aptEnd = timeToMinutes(apt.endTime);
          return Math.max(slotStartMin, aptStart) < Math.min(slotEndMin, aptEnd);
        });

        if (!hasConflict) {
          availableDocs.push({
            id: doctor.id,
            name: doctor.user.name,
          });
        }
      }

      const isAvailable = availableDocs.length > 0;

      slots.push({
        time: slotStartStr,
        startTime: slotStartStr,
        endTime: slotEndStr,
        available: isAvailable,
        isAvailable,
        availableDoctorIds: availableDocs.map((d) => d.id),
        availableDoctors: availableDocs,
      });
    }

    return NextResponse.json({
      date: dateStr,
      duration,
      slots,
    });
  } catch (error) {
    console.error("Failed to compute slots:", error);
    return NextResponse.json({ error: "Failed to generate slots" }, { status: 500 });
  }
}
