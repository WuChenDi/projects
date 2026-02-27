import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  /* config options here */
  // output: 'export',
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'notes-wudi.pages.dev',
      },
    ],
  },
}

export default nextConfig
