import { NextRequest, NextResponse } from "next/server"

import { DEFAULT_LANG, isLang, type Lang } from "@/lib/i18n/lang"

function hasFileExtension(pathname: string): boolean {
  return /\.[^/]+$/.test(pathname)
}

function langFromAcceptLanguage(headerValue: string | null): Lang {
  if (!headerValue) return DEFAULT_LANG
  // Example: "en-US,en;q=0.9,ja;q=0.8"
  const first = headerValue.split(",")[0]?.trim().toLowerCase()
  if (first?.startsWith("en")) return "en"
  if (first?.startsWith("ja")) return "ja"
  return DEFAULT_LANG
}

function detectLang(req: NextRequest): Lang {
  const cookieLang = req.cookies.get("lang")?.value
  if (isLang(cookieLang)) return cookieLang
  return langFromAcceptLanguage(req.headers.get("accept-language"))
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // exclude non-public routes + static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    hasFileExtension(pathname)
  ) {
    return NextResponse.next()
  }

  const seg0 = pathname.split("/").filter(Boolean)[0]

  // already prefixed: pass-through, but set request header + cookie for RootLayout <html lang>
  if (isLang(seg0)) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-lang", seg0)
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.cookies.set("lang", seg0, { path: "/", sameSite: "lax" })
    return res
  }

  // missing prefix: redirect to /{lang}/...
  const lang = detectLang(req)
  const url = req.nextUrl.clone()
  url.pathname = pathname === "/" ? `/${lang}` : `/${lang}${pathname}`
  const res = NextResponse.redirect(url)
  res.cookies.set("lang", lang, { path: "/", sameSite: "lax" })
  return res
}

export const config = {
  matcher: ["/((?!_next|api|admin|.*\\..*).*)"],
}


