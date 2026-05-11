import { NextRequest, NextResponse } from "next/server";

import { markProjectPaidFromWebhook } from "@/lib/projects";
import { verifyPaystackTransaction } from "@/lib/paystack";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");

  if (!reference) {
    return NextResponse.json(
      { error: "Missing payment reference." }, 
      { status: 400 },
    );
  }

  try {
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

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify payment.";

    if (message === "PROJECT_NOT_FOUND") {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (message === "AMOUNT_MISMATCH") {
      return NextResponse.json(
        { error: "Payment amount mismatch." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
