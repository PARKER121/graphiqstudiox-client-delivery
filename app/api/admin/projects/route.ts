import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiUser } from "@/lib/auth";
import { uploadPreviewToCloudinary } from "@/lib/cloudinary";
import { createProject } from "@/lib/projects";
import { uploadDeliverableFile } from "@/lib/uploadthing";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminApiUser(request);
    
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError) {
      const message = formError instanceof Error ? formError.message : "Failed to parse form data";
      return NextResponse.json(
        { error: `Form data error: ${message}` },
        { status: 400 },
      );
    }

    const clientName = String(formData.get("clientName") ?? "").trim();
    const clientEmail = String(formData.get("clientEmail") ?? "")
      .trim()
      .toLowerCase();
    const title = String(formData.get("title") ?? "").trim();
    const priceMajor = Number(formData.get("price") ?? 0);
    const downloadLimitInput = Number(formData.get("downloadLimit") ?? 3);
    const previewFile = formData.get("previewFile");
    const finalFile = formData.get("finalFile");

    if (!clientName || !title) {
      return NextResponse.json(
        { error: "Client name and title are required." },
        { status: 400 },
      );
    }

    if (!clientEmail || !isValidEmail(clientEmail)) {
      return NextResponse.json(
        { error: "A valid client email is required." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(priceMajor) || priceMajor <= 0) {
      return NextResponse.json(
        { error: "Price must be greater than zero." },
        { status: 400 },
      );
    }

    if (!(previewFile instanceof File) || previewFile.size === 0) {
      return NextResponse.json(
        { error: "A preview file is required." },
        { status: 400 },
      );
    }

    if (!(finalFile instanceof File) || finalFile.size === 0) {
      return NextResponse.json(
        { error: "A final delivery file is required." },
        { status: 400 },
      );
    }

    const token = crypto.randomUUID();
    const downloadLimit = Number.isInteger(downloadLimitInput)
      ? Math.min(Math.max(downloadLimitInput, 1), 3)
      : 3;
    const price = Math.round(priceMajor * 100);

    const [previewUrl, deliverableReference] = await Promise.all([
      uploadPreviewToCloudinary(previewFile, token),
      uploadDeliverableFile(finalFile),
    ]);

    const project = await createProject({
      clientEmail,
      clientName,
      downloadLimit,
      fileUrl: deliverableReference,
      previewUrl,
      price,
      title,
      token,
    });

    return NextResponse.json({
      ok: true,
      project,
      sharePath: `/p/${project.token}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create project.",
      },
      { status: 500 },
    );
  }
}
