import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Performance optimizations
  // reactStrictMode: true,
  // poweredByHeader: false,
  // output: 'standalone',
  // outputFileTracingRoot: __dirname,
  // turbopack: {
  //   root: __dirname,
  // },

  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'notes-wudi.pages.dev',
      },
      {
        protocol: 'https',
        hostname: 'developers.cloudflare.com',
      },
    ],
  },
}

export default nextConfig

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

void initOpenNextCloudflareForDev()
