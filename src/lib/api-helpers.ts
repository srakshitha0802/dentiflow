import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission, Permission, Role } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// ─── Get Authenticated User ──────────────────────────────────
export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user;
}

// ─── Require Auth + Permission ────────────────────────────────
export async function requirePermission(permission: Permission) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }
  if (!hasPermission(user.role as Role, permission)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      user: null,
    };
  }
  return { error: null, user };
}

// ─── Create Audit Log ────────────────────────────────────────
export async function createAuditLog(params: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  previousData?: unknown;
  newData?: unknown;
  req?: NextRequest;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        previousData: params.previousData
          ? JSON.stringify(params.previousData)
          : undefined,
        newData: params.newData ? JSON.stringify(params.newData) : undefined,
        ipAddress: params.req?.headers.get("x-forwarded-for") ?? undefined,
        userAgent: params.req?.headers.get("user-agent") ?? undefined,
      },
    });
  } catch (e) {
    // Audit log failures should not break the main operation
    console.error("Audit log failed:", e);
  }
}

// ─── Standard API Error Responses ────────────────────────────
export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function notFound(resource: string = "Resource") {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError(message: string = "An unexpected error occurred") {
  return NextResponse.json({ error: message }, { status: 500 });
}

// ─── Parse and validate pagination params ────────────────────
export function parsePaginationParams(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// ─── Notification Helper ──────────────────────────────────────
export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type as any,
        title: params.title,
        message: params.message,
        link: params.link,
      },
    });
  } catch (e) {
    console.error("Notification creation failed:", e);
  }
}
