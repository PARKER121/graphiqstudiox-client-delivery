import { NextRequest, NextResponse } from "next/server";

import { markProjectPaidFromWebhook } from "@/lib/projects";
import {
  verifyPaystackSignature,
  verifyPaystackTransaction,
} from "@/lib/paystack";

export const runtime = "nodejs";

interface WebhookEventPayload {
  data?: {
    reference?: string;
  };
  event?: string;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody) as WebhookEventPayload;

    if (event.event !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    const reference = event.data?.reference;

    if (!reference) {
      return NextResponse.json(
        { error: "Missing payment reference." },
        { status: 400 },
      );
    }

    const verifiedTransaction = await verifyPaystackTransaction(reference);

    if (verifiedTransaction.status !== "success") {
      return NextResponse.json(
        { error: "Payment has not settled successfully." },
        { status: 400 },
      );
    }

    const token =
      typeof verifiedTransaction.metadata?.token === "string"
        ? verifiedTransaction.metadata.token
        : null;

    if (!token) {
      return NextResponse.json(
        { error: "Payment metadata is missing the project token." },
        { status: 400 },
      );
    }

    await markProjectPaidFromWebhook({
      amount: verifiedTransaction.amount,
      paystackRef: verifiedTransaction.reference,
      status: verifiedTransaction.status,
      token,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed.";

    switch (message) {
      case "PROJECT_NOT_FOUND":
        return NextResponse.json({ error: "Project not found." }, { status: 404 });
      case "AMOUNT_MISMATCH":
        return NextResponse.json(
          { error: "Payment amount mismatch." },
          { status: 400 },
        );
      default:
        return NextResponse.json(
          { error: "Webhook processing failed." },
          { status: 500 },
        );
    }
  }
}
