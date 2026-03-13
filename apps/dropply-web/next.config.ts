import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  env: {
    BUILD_TIME: new Date().toLocaleString(),
  },
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'notes-wudi.pages.dev',
      },
    ],
  },
}

export default nextConfig
