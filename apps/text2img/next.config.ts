import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: './messages/en.json',
  },
})

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
      { protocol: 'https', hostname: 'wcd.pages.dev' },
      { protocol: 'https', hostname: 'developers.cloudflare.com' },
    ],
  },
}

export default withNextIntl(nextConfig)

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

void initOpenNextCloudflareForDev()
