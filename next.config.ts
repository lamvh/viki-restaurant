import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pin the tracing root to this project so a stray parent-dir lockfile
  // can't be mistaken for the workspace root.
  outputFileTracingRoot: __dirname,
  images: {
    // Scoped to a single trusted host — no wildcard image sources.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.foodhub.com',
      },
    ],
  },
};

export default nextConfig;
