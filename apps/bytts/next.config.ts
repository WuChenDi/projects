import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    BUILD_TIME: new Date().toLocaleString(),
  },
  // reactStrictMode: true,
  // poweredByHeader: false,
  output: 'standalone',
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wcd.pages.dev',
      },
    ],
  },
}

export default nextConfig
