/**
 * Curated full source list, hosted remotely.
 *
 * The settings page offers a one-click import that fetches this URL. Since it's
 * an external address, `fetchSourcesFromUrl` routes it through `/api/proxy` to
 * avoid CORS; the parsed sources are merged into the user's existing sources.
 */
export const BUILTIN_SOURCES_URL =
  'https://cdn.jsdelivr.net/gh/WuChenDi/static/flox/sources-link-all.json'

export const BUILTIN_SOURCES_NAME = '完整源'
