import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, parsePaginationParams, badRequest, serverError } from "@/lib/api-helpers";
import bcrypt from "bcryptjs";
import { userSchema } from "@/lib/validations";
import { generateUserId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("users:read");
  if (error) return error;

  try {
    const { page, limit, skip } = parsePaginationParams(req);
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") ?? "";
    const search = searchParams.get("search") ?? "";

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: { id: true, email: true, name: true, role: true, phone: true, isActive: true, lastLogin: true, createdAt: true, avatar: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ data: users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { error, user } = await requirePermission("users:write");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));

    const data = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role,
        phone: data.phone,
        isActive: true,
      },
      select: { id: true, email: true, name: true, role: true, phone: true, isActive: true, createdAt: true },
    });

    return NextResponse.json({ data: newUser, message: "User created successfully." }, { status: 201 });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
