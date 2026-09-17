import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, createAuditLog, badRequest, serverError } from "@/lib/api-helpers";
import { clinicSettingsSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("settings:read");
  if (error) return error;

  try {
    const settings = await prisma.clinicSetting.findMany();
    const settingsMap = settings.reduce<Record<string, string>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    return NextResponse.json({ data: settingsMap });
  } catch (e) {
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const { error, user } = await requirePermission("settings:write");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = clinicSettingsSchema.partial().safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));

    const data = parsed.data;
    const updates = Object.entries(data).filter(([, v]) => v !== undefined);

    await Promise.all(
      updates.map(([key, value]) =>
        prisma.clinicSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    await createAuditLog({
      userId: user!.id,
      action: "SETTINGS_UPDATED",
      entity: "ClinicSetting",
      newData: data,
      req,
    });

    return NextResponse.json({ message: "Settings updated successfully." });
  } catch (e) {
    return serverError();
  }
}
