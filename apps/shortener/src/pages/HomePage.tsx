import type { FC } from 'hono/jsx'
import { Layout } from './Layout'

interface HomePageProps {
  url: string
  version: string
  totalLinks: number | null
  database: 'connected' | 'disconnected'
  analytics: 'available' | 'unavailable'
  ai: 'enabled' | 'disabled'
}

export const HomePage: FC<HomePageProps> = ({
  url,
  version,
  totalLinks,
  database,
  analytics,
  ai,
}) => {
  return (
    <Layout>
      <div class="container">
        <div class="header">
          <h1>Shortener</h1>
          <p>
            Privacy-first URL shortener with AI-generated slugs, edge-cached
            redirects, and click analytics. Runs entirely on Cloudflare
            Workers.
          </p>
        </div>

        <main>
          <div class="stats">
            <div class="stat">
              <span class="stat-label">Active links</span>
              <span class="stat-value">
                {totalLinks == null ? '--' : totalLinks.toLocaleString()}
              </span>
            </div>
            <div class="stat">
              <span class="stat-label">Version</span>
              <span class="stat-value">{version}</span>
            </div>
            <div class="stat">
              <span
                class={`badge ${database === 'connected' ? 'ok' : 'bad'}`}
              >
                D1 {database === 'connected' ? 'connected' : 'down'}
              </span>
            </div>
            <div class="stat">
              <span
                class={`badge ${analytics === 'available' ? 'ok' : 'bad'}`}
              >
                Analytics {analytics === 'available' ? 'on' : 'off'}
              </span>
            </div>
            <div class="stat">
              <span class={`badge ${ai === 'enabled' ? 'ok' : 'bad'}`}>
                AI slug {ai === 'enabled' ? 'on' : 'off'}
              </span>
            </div>
          </div>

          <section>
            <h2>How it works</h2>
            <p>
              <code>POST /api/url</code> creates a short link backed by
              Drizzle on D1. Redirects through <code>GET /:shortCode</code>{' '}
              hit a 1-hour KV cache before falling through to the database.
              Every redirect emits an event to Cloudflare Analytics Engine.
            </p>
          </section>

          <section>
            <h2>Quick start</h2>
            <p>
              Admin endpoints under <code>/api/*</code> require an ES256
              JWT in <code>Authorization: Bearer &lt;token&gt;</code>.
              Create a link:
            </p>
            <pre>
              <code>{`curl -X POST ${url}/api/url \\
  -H "Authorization: Bearer $JWT" \\
  -H "Content-Type: application/json" \\
  -d '{
    "records": [
      { "url": "https://example.com/very/long/path" }
    ]
  }'`}</code>
            </pre>
            <p>Response:</p>
            <pre>
              <code>{`{
  "code": 0,
  "message": "ok",
  "data": {
    "successes": [
      {
        "success": true,
        "hash": "<sha256-hex>",
        "shortCode": "ab12CDef",
        "shortUrl": "${url}/ab12CDef",
        "url": "https://example.com/very/long/path",
        "expiresAt": 1730000000000
      }
    ],
    "failures": []
  }
}`}</code>
            </pre>
            <p>Then anyone can follow the short link:</p>
            <pre>
              <code>{`curl -I ${url}/ab12CDef
# HTTP/2 302
# location: https://example.com/very/long/path`}</code>
            </pre>
          </section>

          <section>
            <h2>API endpoints</h2>

            <div class="endpoint">
              <div class="endpoint-title">
                <span class="method get">GET</span>
                <span class="path">/:shortCode</span>
              </div>
              <p class="note">
                Public 302 redirect. Social-media crawlers are sent to{' '}
                <code>/:shortCode/og</code> for preview rendering.
              </p>
            </div>

            <div class="endpoint">
              <div class="endpoint-title">
                <span class="method get">GET</span>
                <span class="path">/health</span>
              </div>
              <p class="note">
                JSON service health check (DB + Analytics readiness).
              </p>
            </div>

            <div class="endpoint">
              <div class="endpoint-title">
                <span class="method post">POST</span>
                <span class="path">/api/url</span>
              </div>
              <p class="note">
                Batch create up to 100 links. Each record may include an
                optional custom <code>hash</code>, <code>userId</code>,{' '}
                <code>expiresAt</code> (epoch ms), or <code>attribute</code>{' '}
                blob.
              </p>
            </div>

            <div class="endpoint">
              <div class="endpoint-title">
                <span class="method put">PUT</span>
                <span class="path">/api/url</span>
              </div>
              <p class="note">
                Batch update up to 100 links by hash; clears the redirect
                cache.
              </p>
            </div>

            <div class="endpoint">
              <div class="endpoint-title">
                <span class="method delete">DELETE</span>
                <span class="path">/api/url</span>
              </div>
              <p class="note">
                Batch soft-delete up to 100 links; clears both redirect and
                OG caches.
              </p>
            </div>

            <div class="endpoint">
              <div class="endpoint-title">
                <span class="method get">GET</span>
                <span class="path">/api/ai/slug?url=...</span>
              </div>
              <p class="note">
                Generate a memorable slug via Workers AI (cached 7d in KV).
                Also: <code>POST /api/ai/batch-slug</code>,{' '}
                <code>GET /api/ai/suggestions</code>.
              </p>
            </div>

            <div class="endpoint">
              <div class="endpoint-title">
                <span class="method get">GET</span>
                <span class="path">/api/analytics/overview</span>
              </div>
              <p class="note">
                Aggregate clicks/visitors across all links. Sibling
                endpoints: <code>/timeseries</code>,{' '}
                <code>/top-countries</code>, <code>/top-referrers</code>,{' '}
                <code>/devices</code>, <code>/browsers</code>,{' '}
                <code>/operating-systems</code>,{' '}
                <code>/link/:hash</code>, <code>/real-time</code>.
              </p>
            </div>
          </section>

          <section>
            <h2>Create-link parameters</h2>
            <div class="params">
              <div class="param">
                <span class="param-name">url</span>
                <span class="param-desc">Target URL (required)</span>
                <span class="param-default">--</span>
              </div>
              <div class="param">
                <span class="param-name">hash</span>
                <span class="param-desc">
                  Custom short code; alphanumeric + <code>-_</code>
                </span>
                <span class="param-default">auto</span>
              </div>
              <div class="param">
                <span class="param-name">expiresAt</span>
                <span class="param-desc">Expiration epoch (ms)</span>
                <span class="param-default">+1h</span>
              </div>
              <div class="param">
                <span class="param-name">userId</span>
                <span class="param-desc">Owner identifier</span>
                <span class="param-default">empty</span>
              </div>
              <div class="param">
                <span class="param-name">attribute</span>
                <span class="param-desc">Arbitrary blob payload</span>
                <span class="param-default">null</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </Layout>
  )
}
