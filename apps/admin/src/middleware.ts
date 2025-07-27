import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authMiddleware } from "@acme/auth/middlewares/admin";

// Public paths that don't require authentication
const publicPaths = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

// Main middleware function that handles authentication with public path exceptions
export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if the current path is a public path
  const isPublicPath = publicPaths.some(
    (path) => pathname.endsWith(path) || pathname === "/",
  );

  // For public paths, allow access without authentication
  if (isPublicPath) {
    return NextResponse.next();
  }

  // For protected paths, apply authentication
  try {
    return authMiddleware(request);
  } catch (error) {
    console.error("Auth middleware error:", error);
    // If auth fails, redirect to signin
    return NextResponse.redirect(new URL("/signin", request.url));
  }
}

// Read more: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
