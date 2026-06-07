"use client";

import { useState, useEffect } from "react";

interface PaymentButtonProps {
  amount: number;
  clientEmail: string;
  clientName: string;
  paystackPublicKey: string;
  title: string;
  token: string;
}

function generateReference(token: string): string {
  // Always use Math.random for consistent reference generation
  // This avoids hydration mismatches between server and client
  return `proj_${token.slice(0, 8)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function PaymentButton({
  amount,
  clientEmail,
  clientName,
  paystackPublicKey,
  title,
  token,
}: PaymentButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handlePayment() {
    setIsLoading(true);
    setError(null);

    try {
      const { default: Paystack } = await import("@paystack/inline-js");
      const popup = new Paystack();
      const reference = generateReference(token);
      const callbackUrl = `${window.location.origin}/p/${token}?payment=processing`;

      popup.newTransaction({
        amount,
        callback_url: callbackUrl,
        currency: "GHS",
        email: clientEmail,
        key: paystackPublicKey,
        metadata: {
          clientName,
          title,
          token,
        },
        onCancel: () => {
          setIsLoading(false);
        },
        onError: () => {
          setError("Paystack could not open the payment window.");
          setIsLoading(false);
        },
        onSuccess: async (transaction) => {
          try {
            await fetch(
              `/api/paystack/verify?reference=${encodeURIComponent(
                transaction.reference,
              )}`,
            );
          } catch {
            // If verify fails, still redirect to the processing page so the
            // webhook can update the project status later.
          }

          const nextUrl = `/p/${token}?payment=processing&reference=${transaction.reference}`;
          window.location.assign(nextUrl);
        },
        reference,
      });
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Unable to start the payment flow.",
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handlePayment}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Opening Paystack..." : "Pay now to unlock"}
      </button>

      {error ? (
        <p className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
