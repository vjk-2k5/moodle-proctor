import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { authCookieOptions, BACKEND_TOKEN_COOKIE, MOODLE_TOKEN_COOKIE } from "@/lib/auth";

export async function POST() {
  cookies().set(MOODLE_TOKEN_COOKIE, "", { ...authCookieOptions, maxAge: 0 });
  cookies().set(BACKEND_TOKEN_COOKIE, "", { ...authCookieOptions, maxAge: 0 });
  return NextResponse.json({ ok: true });
}

