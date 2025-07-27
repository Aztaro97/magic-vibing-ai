import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Using the lightweight session cookie check as recommended in Better Auth docs
export function authMiddleware(request: NextRequest, response?: NextResponse) {
  // Use getSessionCookie for a fast, non-blocking check
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  // If we have a response from a previous middleware, use it
  // This allows us to maintain the cookies, headers, etc. from the intl middleware
  if (response) {
    // Transfer cookies from the auth response to the intl response
    const allCookies = request.cookies.getAll();
    for (const cookie of allCookies) {
      response.cookies.set(cookie.name, cookie.value);
    }
    return response;
  }

  return NextResponse.next();
}
