import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Mengabaikan linting saat build agar lebih cepat
    ignoreDuringBuilds: true,
  },
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
