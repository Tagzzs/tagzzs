/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Allow native modules on server side
      config.externals = [...(config.externals || []), 'chromadb', 'onnxruntime-node'];
    }
    return config;
  },
};

export default nextConfig;

