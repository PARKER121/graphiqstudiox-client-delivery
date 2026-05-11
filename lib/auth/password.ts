import "server-only";

import crypto from "node:crypto";

import { getAdminPassword } from "@/lib/env";

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyAdminPassword(providedPassword: string): boolean {
  try {
    const adminPassword = getAdminPassword();
    return safeCompare(providedPassword, adminPassword);
  } catch {
    return false;
  }
}

