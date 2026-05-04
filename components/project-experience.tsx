"use client";

import { startTransition, useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { formatPriceFromMinor } from "@/lib/currency";
import type { PublicProject } from "@/lib/types";
import { PaymentButton } from "./payment-button";

interface ProjectExperienceProps {
  paystackPublicKey: string;
  paymentProcessing: boolean;
  project: PublicProject;
  reference?: string;
}

function statusBadgeClasses(status: PublicProject["status"]) {
  return status === "paid"
    ? "border-emerald-200 bg-[var(--success-soft)] text-[var(--success)]"
    : "border-orange-200 bg-[var(--danger-soft)] text-[var(--danger)]";
}

export function ProjectExperience({
  paystackPublicKey,
  paymentProcessing,
  project,
  reference,
}: ProjectExperienceProps) {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const isLocked = project.status !== "paid";
  const isVideoPreview = /\/video\/upload\//.test(project.previewUrl);
  const previewFileExtension = project.previewUrl
    .split("?")[0]
    .split(".")
    .pop()
    ?.toLowerCase();
  const imagePreviewAvailable =
    previewFileExtension === "png" ||
    previewFileExtension === "jpg" ||
    previewFileExtension === "jpeg" ||
    previewFileExtension === "webp" ||
    previewFileExtension === "gif" ||
    previewFileExtension === "avif" ||
    previewFileExtension === "svg" ||
    previewFileExtension === "bmp";
  const pdfPreviewAvailable = previewFileExtension === "pdf";
  const [showUnlockCelebration, setShowUnlockCelebration] = useState(false);
  const shouldShowUnlockAnimation = paymentProcessing && project.status === "paid";
  const unlockAnimationActive = shouldShowUnlockAnimation && showUnlockCelebration;
  const downloadDisabledByAnimation = project.status === "paid" && showUnlockCelebration;

  const refreshProject = useEffectEvent(() => {
    startTransition(() => {
      router.refresh();
    });
  });

  useEffect(() => {
    if (!paymentProcessing || project.status === "paid") {
      return;
    }

    const intervalId = window.setInterval(() => {
      refreshProject();
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [paymentProcessing, project.status]);

  useEffect(() => {
    if (!paymentProcessing || project.status !== "paid") {
      setShowUnlockCelebration(false);
      return;
    }

    setShowUnlockCelebration(true);
    const timerId = window.setTimeout(() => {
      setShowUnlockCelebration(false);
    }, 2600);

    return () => window.clearTimeout(timerId);
  }, [paymentProcessing, project.status]);

  useEffect(() => {
    if (!paymentProcessing || project.status !== "paid") {
      return;
    }

    window.history.replaceState({}, "", `/p/${project.token}`);
  }, [paymentProcessing, project.status, project.token]);

  async function handleDownload(format: "zip" | "image" | "pdf") {
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch(
        `/api/download?token=${encodeURIComponent(project.token)}&format=${format}`,
      );
      const payload = (await response.json()) as { error?: string; url?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to start your download.");
      }

      window.location.assign(payload.url);
      router.refresh();
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "Download could not start.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section
      className="grid gap-8 py-4 lg:grid-cols-[1.18fr_0.82fr]"
      onContextMenu={(event) => {
        if (isLocked) {
          event.preventDefault();
        }
      }}
    >
      <div className="overflow-hidden rounded-[36px] border border-white/60 bg-[var(--surface)] p-5 shadow-[var(--shadow)] backdrop-blur sm:p-7">
        <div className="relative overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--background-strong)]">
          {isVideoPreview ? (
            <video
              src={project.previewUrl}
              autoPlay
              className="aspect-video w-full object-cover transition duration-700 scale-[1.02]"
              controls={!isLocked}
              loop
              muted
              playsInline
            />
          ) : pdfPreviewAvailable ? (
            <object
              data={project.previewUrl}
              type="application/pdf"
              className="h-[420px] w-full"
            >
              <div className="flex h-full w-full items-center justify-center rounded-[28px] border border-dashed border-white/40 bg-slate-950/5 p-8 text-center text-sm text-[var(--foreground-muted)]">
                <p>
                  PDF preview is available. <a className="underline" href={project.previewUrl} target="_blank" rel="noreferrer">Open it in a new tab</a> if it does not display.
                </p>
              </div>
            </object>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.previewUrl}
              alt={project.title}
              className="aspect-video w-full object-cover transition duration-700 scale-[1.02]"
            />
          )}

          {isLocked ? (
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center bg-slate-950/5 px-6 text-center ${
                shouldShowUnlockAnimation ? "animate-unlock" : ""
              }`}
            >
              <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.34em] text-white/80">
                Preview - Not Paid
              </div>
              <p className="mt-5 max-w-md text-sm leading-7 text-white/80 sm:text-base">
                Your final delivery unlocks instantly after payment confirmation.
              </p>
            </div>
          ) : null}

          {shouldShowUnlockAnimation ? (
            <div className="animate-unlock absolute inset-0 bg-emerald-200/60 backdrop-blur-md" />
          ) : null}
        </div>
      </div>

      <div className="relative flex flex-col gap-6 rounded-[36px] border border-white/60 bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
              Private Delivery
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              {project.title}
            </h1>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusBadgeClasses(project.status)}`}
          >
            {project.status}
          </span>
        </div>

        <div className="grid gap-4 rounded-[28px] border border-[var(--line)] bg-white/75 p-5">
          <div>
            <p className="text-sm text-[var(--foreground-muted)]">Prepared for</p>
            <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
              {project.clientName}
            </p>
          </div>
          <div className="grid gap-3 text-sm text-[var(--foreground-muted)] sm:grid-cols-2">
            <div>
              <p>Price</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {formatPriceFromMinor(project.price)}
              </p>
            </div>
            <div>
              <p>Downloads remaining</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {Math.max(project.downloadLimit - project.downloadsUsed, 0)} /{" "}
                {project.downloadLimit}
              </p>
            </div>
          </div>
        </div>

        {paymentProcessing && project.status !== "paid" ? (
          <div className="animate-rise-in rounded-[28px] border border-teal-200 bg-teal-50 px-5 py-4 text-sm text-teal-800">
            Payment received{reference ? ` (${reference})` : ""}. We&apos;re
            waiting for secure confirmation from Paystack and will unlock this
            page automatically.
          </div>
        ) : null}

        {project.status === "paid" ? (
          <div className="animate-rise-in rounded-[28px] border border-emerald-200 bg-[var(--success-soft)] px-5 py-4 text-sm text-[var(--success)]">
            Download available. This link can generate up to{" "}
            {project.downloadLimit} secure downloads.
          </div>
        ) : (
          <div className="rounded-[28px] border border-orange-200 bg-[var(--danger-soft)] px-5 py-4 text-sm text-[var(--danger)]">
            Preview access is active. Complete payment to remove the lock and
            enable secure delivery.
          </div>
        )}

        {unlockAnimationActive ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[36px] bg-emerald-950/85 p-8 text-center text-white animate-celebrate">
            <div className="relative flex w-full max-w-sm flex-col items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                <span className="text-4xl font-semibold text-emerald-200">✓</span>
              </div>
              <div>
                <p className="text-xl font-semibold">Payment confirmed</p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/85">
                  Your secure download is being unlocked. Please wait a moment
                  while we prepare your files.
                </p>
              </div>
              <div className="relative mt-4 h-16 w-full overflow-hidden">
                <span className="confetti-piece confetti-green" />
                <span className="confetti-piece confetti-yellow" />
                <span className="confetti-piece confetti-white" />
                <span className="confetti-piece confetti-blue" />
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {project.status === "paid" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleDownload("zip")}
                disabled={isDownloading || downloadDisabledByAnimation}
                className="inline-flex w-full items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloadDisabledByAnimation
                  ? "Preparing download..."
                  : isDownloading
                  ? "Preparing secure download..."
                  : "Download .zip"}
              </button>
              <button
                type="button"
                onClick={() => handleDownload("image")}
                disabled={isDownloading || !imagePreviewAvailable || downloadDisabledByAnimation}
                className="inline-flex w-full items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {imagePreviewAvailable ? "Download image" : "Image unavailable"}
              </button>
              <button
                type="button"
                onClick={() => handleDownload("pdf")}
                disabled={isDownloading || !pdfPreviewAvailable || downloadDisabledByAnimation}
                className="inline-flex w-full items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pdfPreviewAvailable ? "Download PDF" : "PDF unavailable"}
              </button>
            </div>
          ) : (
            <PaymentButton
              amount={project.price}
              clientEmail={project.clientEmail}
              clientName={project.clientName}
              paystackPublicKey={paystackPublicKey}
              title={project.title}
              token={project.token}
            />
          )}

          {downloadError ? (
            <p className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-[var(--danger)]">
              {downloadError}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
