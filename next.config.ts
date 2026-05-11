import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverRuntimeConfig: {
    // Increase payload size limit
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
  // Increase request timeout
  api: {
    responseLimit: "50mb",
  },
};

export default nextConfig;
