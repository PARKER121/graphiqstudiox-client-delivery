import { NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
  createAdminSession,
  verifyAdminPassword,
} from "@/lib/auth";
import { rateLimit } from "@/lib/middleware/rateLimit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get("x-forwarded-for") || "unknown";
  const rateLimitKey = `login:${clientIp}`;

  const limit = rateLimit(rateLimitKey, 5, 15 * 60 * 1000);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as { password?: string };

    if (!body.password) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );
    }

    const isValid = verifyAdminPassword(body.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );
    }

    const sessionCookie = createAdminSession();
    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      httpOnly: true,
      maxAge: SESSION_DURATION_MS / 1000,
      name: SESSION_COOKIE_NAME,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      value: sessionCookie,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to sign in to admin." },
      { status: 401 },
    );
  }
}
