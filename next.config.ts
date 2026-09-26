import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Mengabaikan error type-checking saat build (mempercepat proses compile)
    ignoreBuildErrors: true,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  // Optimasi caching untuk output build
  compress: true,
};

export default nextConfig;
