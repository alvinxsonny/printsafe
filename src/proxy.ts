import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Better Auth session token cookie
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    (process.env.ALLOW_TEST_AUTH === "true"
      ? request.cookies.get("ps_test_role")?.value
      : undefined);

  // 1. Protect Customer routes (/app/*)
  if (pathname.startsWith("/app")) {
    if (!sessionToken) {
      const url = new URL("/login", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // 2. Protect Merchant routes (/merchant/*)
  if (pathname.startsWith("/merchant")) {
    const isPublicMerchantRoute =
      pathname === "/merchant/login" || pathname === "/merchant/signup";

    if (!isPublicMerchantRoute && !sessionToken) {
      const url = new URL("/merchant/login", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // 3. Protect Admin routes (/admin/*)
  if (pathname.startsWith("/admin")) {
    const isPublicAdminRoute = pathname === "/admin/login";

    if (!isPublicAdminRoute && !sessionToken) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ["/app/:path*", "/merchant/:path*", "/admin/:path*"],
};
