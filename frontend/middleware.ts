import { NextRequest, NextResponse } from "next/server";

import { MOODLE_TOKEN_COOKIE } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const token = req.cookies.get(MOODLE_TOKEN_COOKIE)?.value;
  if (token) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};