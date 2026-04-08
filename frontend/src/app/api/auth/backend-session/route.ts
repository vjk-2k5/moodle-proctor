import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { BACKEND_TOKEN_COOKIE } from "@/lib/auth";

export async function GET() {
  const token = cookies().get(BACKEND_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    token,
  });
}
