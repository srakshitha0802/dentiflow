import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that are always public
const publicPaths = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/book",
  "/portal",
  "/patient",
  "/api/patient",
  "/api/public",
];

// Role-restricted paths
const roleRestrictions: Record<string, string[]> = {
  "/audit-logs": ["ADMIN"],
  "/users": ["ADMIN"],
  "/settings": ["ADMIN"],
  "/reports": ["ADMIN", "ACCOUNTANT", "DENTIST"],
  "/expenses": ["ADMIN", "ACCOUNTANT"],
  "/inventory": ["ADMIN", "INVENTORY_MANAGER"],
  "/suppliers": ["ADMIN", "INVENTORY_MANAGER"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths and home page
  if (pathname === "/" || publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Check role restrictions
  const userRole = req.auth.user?.role;
  for (const [path, allowedRoles] of Object.entries(roleRestrictions)) {
    if (pathname.startsWith(path) && userRole && !allowedRoles.includes(userRole)) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
