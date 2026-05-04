import { NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
  createAdminSession,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { password?: string };

    if (!body.password) {
      return NextResponse.json(
        { error: "Missing admin password." },
        { status: 400 },
      );
    }

    const sessionCookie = createAdminSession(body.password);
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
      {
        error:
          error instanceof Error ? error.message : "Unable to sign in to admin.",
      },
      { status: 401 },
    );
  }
}
