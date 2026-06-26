import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    BUILD_TIME: new Date().toLocaleString(),
  },
  allowedDevOrigins: ['wepush.a.wd.ds.cc'],
  // Keep the libsql packages unbundled so wrangler resolves them at runtime via
  // the correct `workerd` export condition. `@libsql/isomorphic-ws` ships
  // workerd-specific code; per OpenNext docs it (and the libsql client/hrana
  // chain that pulls it in) must be external, otherwise the build fails with
  // "Could not resolve @libsql/isomorphic-ws".
  // https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: [
    '@libsql/client',
    '@libsql/hrana-client',
    '@libsql/isomorphic-ws',
  ],
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

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

void initOpenNextCloudflareForDev()
