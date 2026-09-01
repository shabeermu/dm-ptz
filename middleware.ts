import { type NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, SESSION_COOKIE_NAME } from "@/lib/session"

const PUBLIC_API_PREFIXES = [
  "/api/instagram/webhook",
  "/api/instagram/callback",
  "/api/auth/",
]

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/dashboard")) {
    const hasOAuthCode = request.nextUrl.searchParams.has("code")
    if (!hasOAuthCode) {
      const session = await getSessionFromRequest(request)
      if (!session) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = "/"
        loginUrl.search = ""
        return NextResponse.redirect(loginUrl)
      }
    }
  }

  if (pathname.startsWith("/api/") && !isPublicApiRoute(pathname)) {
    if (pathname === "/api/instagram/test-login" && process.env.NODE_ENV !== "production") {
      return NextResponse.next()
    }

    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
}

// Exported for tests and documentation; middleware reads cookie directly.
export { SESSION_COOKIE_NAME }
