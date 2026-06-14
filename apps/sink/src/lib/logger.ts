// Console-based logger (no winston). Mirrors the winston call sites used by the
// Cloudflare Workers apps but stays dependency-free so it runs in every runtime
// (worker, edge route handler, Node test). Debug output is gated by NODE_ENV.
const isDebug = process.env.NODE_ENV !== 'production'

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDebug) console.debug('[sink]', ...args)
  },
  info: (...args: unknown[]) => console.info('[sink]', ...args),
  warn: (...args: unknown[]) => console.warn('[sink]', ...args),
  error: (...args: unknown[]) => console.error('[sink]', ...args),
}
