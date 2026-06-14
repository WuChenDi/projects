import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  env: {
    BUILD_TIME: new Date().toLocaleString(),
  },
  allowedDevOrigins: ['sink.localhost', 'sink.a.wd.ds.cc'],
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
  },
}

export default withNextIntl(nextConfig)

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
// `remoteBindings: false` keeps local dev fully offline — the `AI` binding has no
// local emulation and would otherwise open a credential-gated remote proxy that
// blocks the Cloudflare context. AI is unused in this phase, so a local stub is
// fine. Skipped entirely during `next build` (NEXT_PHASE) to avoid any proxy.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

if (process.env.NEXT_PHASE !== 'phase-production-build') {
  void initOpenNextCloudflareForDev({ remoteBindings: false })
}
