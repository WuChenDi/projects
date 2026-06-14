import type { LinkConfig } from '@/database/schema'

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Only http(s) destinations may be rendered into an HTML page or a client-side
// navigation. Anything else (javascript:, data:, vbscript:, …) becomes
// about:blank so a malicious stored URL can't execute. Returns the *normalized*
// href, which percent-encodes `<`, `>`, `"` so it is also safe inside a
// `<script>` string literal.
export function safeExternalUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href
  } catch {
    // unparseable — fall through to about:blank
  }
  return 'about:blank'
}

// Social-bot preview page. Renders OG/Twitter meta from the link config and
// (when not cloaking) bounces real browsers to the destination.
export function ogPageHtml(
  url: string,
  config: LinkConfig,
  options: { redirect: boolean } = { redirect: true },
): string {
  const target = safeExternalUrl(url)
  const safeUrl = escapeHtml(target)
  const title = escapeHtml(config.title || 'Sink')
  const description = escapeHtml(config.description || '')
  const image = config.image ? escapeHtml(safeExternalUrl(config.image)) : ''
  // JSON.stringify yields a safe, double-quoted JS string literal; `target` is a
  // normalized http(s) href so it cannot contain `</script>`.
  const redirectScript = options.redirect
    ? `<script>window.location.replace(${JSON.stringify(target)});</script>
    <noscript><meta http-equiv="refresh" content="0;url=${safeUrl}" /></noscript>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:type" content="website" />
    ${image ? `<meta property="og:image" content="${image}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${image ? `<meta name="twitter:image" content="${image}" />` : ''}
    <meta name="robots" content="noindex, nofollow" />
    ${redirectScript}
  </head>
  <body>
    <p>Redirecting to <a href="${safeUrl}">${safeUrl}</a>…</p>
  </body>
</html>`
}

// Interstitial shown when a link is flagged unsafe. The user must confirm.
export function unsafeWarningHtml(url: string): string {
  const safeUrl = escapeHtml(safeExternalUrl(url))
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Warning · external link</title>
    <meta name="robots" content="noindex, nofollow" />
    <style>
      body { font-family: system-ui, sans-serif; background: #0b0b0c; color: #e5e5e5; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
      .card { max-width: 32rem; padding: 2rem; border: 1px solid #27272a; border-radius: 1rem; background: #111113; text-align: center; }
      h1 { font-size: 1.25rem; margin: 0 0 0.75rem; }
      p { color: #a1a1aa; word-break: break-all; }
      a.btn { display: inline-block; margin-top: 1.25rem; padding: 0.6rem 1.2rem; border-radius: 0.6rem; background: #e11d48; color: #fff; text-decoration: none; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>⚠️ You are leaving via an unverified link</h1>
      <p>This link was flagged as potentially unsafe. You are about to visit:</p>
      <p><strong>${safeUrl}</strong></p>
      <a class="btn" href="${safeUrl}" rel="noopener noreferrer nofollow">Continue anyway</a>
    </div>
  </body>
</html>`
}

// Password gate form. Submits back to the same slug via POST with the password.
export function passwordFormHtml(slug: string, error = false): string {
  const safeSlug = escapeHtml(slug)
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Protected link</title>
    <meta name="robots" content="noindex, nofollow" />
    <style>
      body { font-family: system-ui, sans-serif; background: #0b0b0c; color: #e5e5e5; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
      .card { width: 22rem; padding: 2rem; border: 1px solid #27272a; border-radius: 1rem; background: #111113; }
      h1 { font-size: 1.1rem; margin: 0 0 1rem; }
      input { width: 100%; box-sizing: border-box; padding: 0.6rem 0.75rem; border-radius: 0.6rem; border: 1px solid #3f3f46; background: #18181b; color: #fff; }
      button { width: 100%; margin-top: 0.75rem; padding: 0.6rem; border: none; border-radius: 0.6rem; background: #6366f1; color: #fff; font-weight: 600; cursor: pointer; }
      .err { color: #f87171; font-size: 0.85rem; margin-top: 0.5rem; }
    </style>
  </head>
  <body>
    <form class="card" method="POST" action="/${safeSlug}">
      <h1>🔒 This link is password protected</h1>
      <input type="password" name="password" placeholder="Enter password" autofocus autocomplete="off" />
      <button type="submit">Unlock</button>
      ${error ? '<p class="err">Incorrect password. Try again.</p>' : ''}
    </form>
  </body>
</html>`
}
