import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { getCloudinaryConfig } from "@/lib/env";

let configured = false;

function getCloudinary() {
  if (!configured) {
    const config = getCloudinaryConfig();

    cloudinary.config({
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      cloud_name: config.cloudName,
      secure: true,
    });

    configured = true;
  }

  return cloudinary;
}

export async function uploadPreviewToCloudinary(file: File, token: string) {
  const bytes = Buffer.from(await file.arrayBuffer());

  return new Promise<string>((resolve, reject) => {
    const upload = getCloudinary().uploader.upload_stream(
      {
        folder: "graphiq-studiox/previews",
        public_id: `${token}-${file.name.replace(/\s+/g, "-").toLowerCase()}`,
        resource_type: "auto",
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error("Cloudinary preview upload failed."));
          return;
        }

        resolve(result.secure_url);
      },
    );

    upload.end(bytes);
  });
}
