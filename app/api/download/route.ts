import { NextRequest, NextResponse } from "next/server";

import { claimProjectDownload, getProjectByToken } from "@/lib/projects";
import { createDeliverableDownloadUrl } from "@/lib/uploadthing";

const imageExtensions = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "avif",
  "svg",
  "bmp",
];

function getPreviewDownloadUrl(previewUrl: string, format: string) {
  const lower = previewUrl
    .split("?")[0]
    .split(".")
    .pop()
    ?.toLowerCase();

  if (!lower) {
    return null;
  }

  if (format === "pdf" && lower === "pdf") {
    return previewUrl;
  }

  if (format === "image" && imageExtensions.includes(lower)) {
    return previewUrl;
  }

  return null;
}

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const format = (request.nextUrl.searchParams.get("format") ?? "zip").toLowerCase();

  if (!token) {
    return NextResponse.json({ error: "Missing project token." }, { status: 400 });
  }

  if (!["zip", "image", "pdf"].includes(format)) {
    return NextResponse.json(
      { error: "Unsupported download format." },
      { status: 400 },
    );
  }

  try {
    const project = await getProjectByToken(token);

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (project.status !== "paid") {
      return NextResponse.json(
        { error: "Payment is required before downloading." },
        { status: 403 },
      );
    }

    if (format === "zip") {
      const { deliverable } = await claimProjectDownload(token);
      const url = await createDeliverableDownloadUrl(deliverable);
      return NextResponse.json({ url });
    }

    const previewUrl = getPreviewDownloadUrl(project.previewUrl, format);

    if (!previewUrl) {
      return NextResponse.json(
        {
          error:
            format === "image"
              ? "No image preview is available for this delivery."
              : "No PDF preview is available for this delivery.",
        },
        { status: 400 },
      );
    }

    await claimProjectDownload(token);
    return NextResponse.json({ url: previewUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed.";

    switch (message) {
      case "PROJECT_NOT_FOUND":
        return NextResponse.json({ error: "Project not found." }, { status: 404 });
      case "PROJECT_UNPAID":
        return NextResponse.json(
          { error: "Payment is required before downloading." },
          { status: 403 },
        );
      case "DOWNLOAD_LIMIT_REACHED":
        return NextResponse.json(
          { error: "Download limit reached for this delivery." },
          { status: 409 },
        );
      default:
        return NextResponse.json(
          { error: "Unable to generate a secure download right now." },
          { status: 500 },
        );
    }
  }
}
