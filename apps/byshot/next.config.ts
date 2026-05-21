import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  env: {
    BUILD_TIME: new Date().toLocaleString(),
  },
  allowedDevOrigins: ['byshot.a.wd.ds.cc'],
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'wcd.pages.dev' },
    ],
  },
}

export default nextConfig
