import "server-only";

import { UTApi } from "uploadthing/server";

import { getUploadThingAcl, getUploadThingToken } from "@/lib/env";
import type { DeliverableReference } from "@/lib/types";

let utapiInstance: UTApi | null = null;

function getUtapi() {
  if (!utapiInstance) {
    utapiInstance = new UTApi({
      token: getUploadThingToken(),
    });
  }

  return utapiInstance;
}

export async function uploadDeliverableFile(file: File) {
  const acl = getUploadThingAcl();
  const response = await getUtapi().uploadFiles(file, {
    acl,
    contentDisposition: "attachment",
  });

  const result = Array.isArray(response) ? response[0] : response;

  if (!result || result.error || !result.data?.key) {
    throw new Error(result?.error?.message ?? "UploadThing upload failed.");
  }

  return serializeDeliverableReference({
    key: result.data.key,
    mode: acl,
    url: result.data.url,
  });
}

export function serializeDeliverableReference(reference: DeliverableReference) {
  return JSON.stringify(reference);
}

export function parseDeliverableReference(value: string): DeliverableReference {
  const parsed = JSON.parse(value) as Partial<DeliverableReference>;

  if (
    !parsed ||
    typeof parsed.key !== "string" ||
    typeof parsed.url !== "string" ||
    (parsed.mode !== "private" && parsed.mode !== "public-read")
  ) {
    throw new Error("Invalid deliverable reference.");
  }

  return parsed as DeliverableReference;
}

export async function createDeliverableDownloadUrl(reference: DeliverableReference) {
  if (reference.mode === "public-read") {
    return reference.url;
  }

  const { ufsUrl } = await getUtapi().generateSignedURL(reference.key, {
    expiresIn: 60 * 10,
  });

  return ufsUrl;
}

export async function deleteDeliverableFile(reference: DeliverableReference) {
  await getUtapi().deleteFiles(reference.key);
}
