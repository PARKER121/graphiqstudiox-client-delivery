function getOptionalEnv(name: string) {
  const value = process.env[name];
  return value?.trim() ? value.trim() : undefined;
}

function getRequiredEnv(name: string) {
  const value = getOptionalEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getAppUrl() {
  const appUrl =
    getOptionalEnv("APP_URL") ??
    getOptionalEnv("NEXT_PUBLIC_APP_URL");

  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }

  const vercelUrl = getOptionalEnv("VERCEL_URL");
  if (vercelUrl) {
    return vercelUrl.startsWith("http")
      ? vercelUrl.replace(/\/$/, "")
      : `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

export function getAdminPassword() {
  return getRequiredEnv("ADMIN_PASSWORD");
}

export function getAdminSessionSecret() {
  return getOptionalEnv("ADMIN_SESSION_SECRET") ?? getAdminPassword();
}

export function getSupabaseUrl() {
  return getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey() {
  return getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function getSupabaseServiceRoleKey() {
  return getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getCloudinaryConfig() {
  return {
    apiKey: getRequiredEnv("CLOUDINARY_API_KEY"),
    apiSecret: getRequiredEnv("CLOUDINARY_API_SECRET"),
    cloudName: getRequiredEnv("CLOUDINARY_CLOUD_NAME"),
  };
}

export function getPaystackPublicKey() {
  return getRequiredEnv("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY");
}

export function getPaystackSecretKey() {
  return getRequiredEnv("PAYSTACK_SECRET_KEY");
}

export function getUploadThingToken() {
  const token = getOptionalEnv("UPLOADTHING_TOKEN");

  if (token) {
    return token;
  }

  const legacySecret = getOptionalEnv("UPLOADTHING_SECRET");
  const legacyAppId = getOptionalEnv("UPLOADTHING_APP_ID");

  if (legacySecret || legacyAppId) {
    throw new Error(
      "UploadThing v7 requires UPLOADTHING_TOKEN. The legacy UPLOADTHING_SECRET and UPLOADTHING_APP_ID values are not enough on their own.",
    );
  }

  throw new Error("Missing required environment variable: UPLOADTHING_TOKEN");
}

export function getUploadThingAcl() {
  const acl = getOptionalEnv("UPLOADTHING_FILE_ACL")?.toLowerCase();

  if (acl === "private") {
    return "private" as const;
  }

  return "public-read" as const;
}
