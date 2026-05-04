import "server-only";

import crypto from "node:crypto";

import { getPaystackSecretKey } from "@/lib/env";

interface VerifyTransactionResponse {
  data?: {
    amount?: number;
    currency?: string;
    metadata?: Record<string, unknown> | null;
    reference?: string;
    status?: string;
  };
  status?: boolean;
}

export interface VerifiedPaystackTransaction {
  amount: number;
  currency: "GHS";
  metadata: Record<string, unknown> | null;
  reference: string;
  status: string;
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) {
    return false;
  }

  const hash = crypto
    .createHmac("sha512", getPaystackSecretKey())
    .update(rawBody)
    .digest("hex");

  return hash === signature;
}

export async function verifyPaystackTransaction(
  reference: string,
): Promise<VerifiedPaystackTransaction> {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${getPaystackSecretKey()}`,
      },
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to verify Paystack transaction.");
  }

  const payload = (await response.json()) as VerifyTransactionResponse;
  const transaction = payload.data;

  if (
    !payload.status ||
    !transaction?.reference ||
    !transaction.status ||
    !transaction.currency ||
    typeof transaction.amount !== "number" ||
    !Number.isInteger(transaction.amount)
  ) {
    throw new Error("Paystack verification payload was incomplete.");
  }

  const amount = transaction.amount;
  const currency = transaction.currency.toUpperCase() as "GHS";
  const status = transaction.status;
  const verifiedReference = transaction.reference;

  return {
    amount,
    currency,
    metadata: transaction.metadata ?? null,
    reference: verifiedReference,
    status,
  };
}
