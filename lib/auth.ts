import "server-only";

import crypto from "node:crypto";

import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { getAdminPassword, getAdminSessionSecret } from "@/lib/env";
import type { SessionAdminUser } from "@/lib/types";

export const SESSION_COOKIE_NAME = "gsx_admin_session";
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 5;

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionValue() {
  return crypto
    .createHmac("sha256", getAdminSessionSecret())
    .update("graphiq-studiox-admin-session")
    .digest("hex");
}

export function createAdminSession(password: string) {
  if (!safeCompare(password, getAdminPassword())) {
    throw new Error("Incorrect admin password.");
  }

  return createSessionValue();
}

function verifySessionValue(value: string) {
  return safeCompare(value, createSessionValue());
}

export async function getCurrentAdminUser(): Promise<SessionAdminUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  return verifySessionValue(sessionCookie) ? { label: "Admin" } : null;
}

export async function requireAdminApiUser(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie || !verifySessionValue(sessionCookie)) {
    throw new Error("Unauthorized admin request.");
  }

  return { label: "Admin" } satisfies SessionAdminUser;
}
