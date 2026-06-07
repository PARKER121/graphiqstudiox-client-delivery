import "server-only";

import crypto from "node:crypto";
import { getCloudinaryConfig } from "@/lib/env";

/**
 * Upload preview to Cloudinary using REST API (lightweight)
 * Removed Node SDK for Vercel Hobby plan memory optimization (2048 MB limit)
 */
export async function uploadPreviewToCloudinary(file: File, token: string) {
  const config = getCloudinaryConfig();
  const bytes = await file.arrayBuffer();
  
  const formData = new FormData();
  formData.append("file", new Blob([bytes], { type: file.type }));
  formData.append("folder", "graphiq-studiox/previews");
  formData.append(
    "public_id",
    `${token}-${file.name.replace(/\s+/g, "-").toLowerCase()}`,
  );
  formData.append("resource_type", "auto");
  formData.append("api_key", config.apiKey);
  
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = {
    api_key: config.apiKey,
    folder: "graphiq-studiox/previews",
    public_id: `${token}-${file.name.replace(/\s+/g, "-").toLowerCase()}`,
    resource_type: "auto",
    timestamp,
  };
  
  const params = Object.entries(paramsToSign)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  
  const signature = crypto
    .createHash("sha1")
    .update(`${params}${config.apiSecret}`)
    .digest("hex");
  
  formData.append("signature", signature);
  formData.append("timestamp", String(timestamp));
  
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }

    const result = (await response.json()) as { secure_url?: string };
    
    if (!result.secure_url) {
      throw new Error("Cloudinary did not return a secure URL");
    }

    return result.secure_url;
  } catch (error) {
    throw new Error(
      `Preview upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
