import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "onnxruntime-node",
  ],
};

export default nextConfig;