import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React Strict Mode for better debugging
  reactStrictMode: true,

  // Enable compression for smaller responses
  compress: true,

  // Image optimization - allow all HTTPS sources
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },

  // External packages for server-side (replaces webpack externals)
  serverExternalPackages: ['chromadb', 'onnxruntime-node'],

  // Empty turbopack config to silence the warning (Next.js 16 uses Turbopack by default)
  turbopack: {},

  // Security headers disabled for development
  // async headers() { ... }
};

export default nextConfig;
