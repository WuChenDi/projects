import type { FC, PropsWithChildren } from 'hono/jsx'

interface LayoutProps {
  title?: string
  description?: string
  keywords?: string
  canonicalUrl?: string
  ogImage?: string
  ogType?: 'website' | 'article'
}

const SITE_URL = 'https://shortener.cdlab.workers.dev'
const SITE_NAME = 'Shortener'
const DEFAULT_OG_IMAGE = 'https://wcd.pages.dev/logo.png'
const DEFAULT_DESCRIPTION =
  'Privacy-first URL shortener with AI-generated slugs and edge-cached redirects.'

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  title = SITE_NAME,
  description = DEFAULT_DESCRIPTION,
  keywords = 'url shortener, link shortener, ai slug, cloudflare workers, edge analytics, hono',
  canonicalUrl = '/',
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  children,
}) => {
  const fullTitle = title === SITE_NAME ? title : `${title} - ${SITE_NAME}`
  const fullCanonicalUrl = `${SITE_URL}${canonicalUrl}`

  return (
    <html lang="en">
      <head>
        {/* Basic */}
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />

        {/* Canonical */}
        <link rel="canonical" href={fullCanonicalUrl} />

        {/* Favicon */}
        <link rel="icon" type="image/png" href={DEFAULT_OG_IMAGE} />
        <link rel="apple-touch-icon" href={DEFAULT_OG_IMAGE} />

        {/* Robots / Crawl */}
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <meta name="referrer" content="no-referrer-when-downgrade" />
        <meta name="distribution" content="global" />
        <meta name="rating" content="general" />

        {/* Author / Publisher */}
        <meta name="author" content="wudi" />
        <meta name="creator" content="wudi" />
        <meta name="publisher" content="wudi" />
        <meta name="copyright" content="© 2023 wudi. All rights reserved." />

        {/* App / Category */}
        <meta name="application-name" content={SITE_NAME} />
        <meta name="category" content="Developer Tools, Web Services" />
        <meta
          name="classification"
          content="Developer Tools, URL Shortener, Edge API"
        />
        <meta name="language" content="en" />

        {/* Open Graph */}
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={ogType} />
        <meta property="og:url" content={fullCanonicalUrl} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content={`${SITE_NAME} - ${description}`}
        />
        <meta property="og:locale" content="en_US" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:site" content="@wuchendi96" />
        <meta name="twitter:creator" content="@wuchendi96" />

        {/* JSON-LD: WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: SITE_NAME,
              url: SITE_URL,
              description,
              inLanguage: 'en',
            }),
          }}
        />

        {/* JSON-LD: WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: SITE_NAME,
              description,
              url: SITE_URL,
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
              },
              author: {
                '@type': 'Person',
                name: 'wudi',
                url: 'https://github.com/WuChenDi',
              },
              publisher: {
                '@type': 'Organization',
                name: 'wudi',
                url: 'https://github.com/WuChenDi',
              },
              inLanguage: 'en',
              isAccessibleForFree: true,
              keywords,
              softwareVersion: '1.0.0',
              featureList: [
                'Short URL creation with custom or AI-generated slugs',
                'Edge-cached redirects via Cloudflare KV',
                'Click analytics via Cloudflare Analytics Engine',
                'Soft delete and TTL-based expiration',
                'JWT-protected admin API (ES256)',
                'OG preview pages for social media crawlers',
                'D1 / LibSQL dual-driver storage (Drizzle)',
              ],
              sameAs: [
                'https://github.com/WuChenDi',
                'https://x.com/wuchendi96',
              ],
            }),
          }}
        />

        {/* JSON-LD: BreadcrumbList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: SITE_URL,
                },
              ],
            }),
          }}
        />

        <style
          dangerouslySetInnerHTML={{
            __html: `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#fafafa;--fg:#111;--muted:#666;--border:#e5e5e5;--accent:#2563eb;--accent-light:#eff6ff;--ok:#16a34a;--bad:#dc2626;--radius:6px;--mono:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
body{font-family:var(--sans);background:var(--bg);color:var(--fg);line-height:1.6;min-height:100vh;display:flex;flex-direction:column}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
code,pre{font-family:var(--mono);font-size:0.875rem}
code{background:#f1f3f5;padding:0.125rem 0.375rem;border-radius:4px}
pre{background:#1e1e1e;color:#d4d4d4;padding:1rem;border-radius:var(--radius);overflow-x:auto;line-height:1.5;margin-bottom:0.75rem}
pre code{background:none;padding:0;color:inherit;font-size:inherit}
.container{max-width:760px;margin:0 auto;padding:0 1.5rem;width:100%}
.header{padding:2rem 0;border-bottom:1px solid var(--border)}
.header h1{font-size:1.5rem;font-weight:600;letter-spacing:-0.02em}
.header p{color:var(--muted);margin-top:0.25rem;font-size:0.9375rem}
main{flex:1;padding:2rem 0}
.stats{display:flex;gap:2rem;margin:1.5rem 0;flex-wrap:wrap}
.stat{display:flex;align-items:baseline;gap:0.5rem}
.stat-label{font-size:0.875rem;color:var(--muted)}
.stat-value{font-size:1.25rem;font-weight:600;font-variant-numeric:tabular-nums}
.badge{display:inline-flex;align-items:center;gap:0.375rem;padding:0.125rem 0.5rem;border-radius:999px;font-size:0.75rem;font-weight:500;border:1px solid var(--border)}
.badge::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--muted)}
.badge.ok{color:var(--ok);border-color:#bbf7d0;background:#f0fdf4}
.badge.ok::before{background:var(--ok)}
.badge.bad{color:var(--bad);border-color:#fecaca;background:#fef2f2}
.badge.bad::before{background:var(--bad)}
section{margin-bottom:2.5rem}
section h2{font-size:1.125rem;font-weight:600;margin-bottom:0.75rem}
section > p{color:var(--muted);font-size:0.9375rem;margin-bottom:1rem}
.endpoint{margin-bottom:1.5rem}
.endpoint-title{display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem}
.method{font-family:var(--mono);font-size:0.75rem;font-weight:600;padding:0.125rem 0.5rem;border-radius:4px;text-transform:uppercase}
.method.get{background:#eff6ff;color:#1e40af}
.method.post{background:#f0fdf4;color:#166534}
.method.put{background:#fefce8;color:#854d0e}
.method.delete{background:#fef2f2;color:#991b1b}
.path{font-family:var(--mono);font-size:0.9375rem;color:var(--fg)}
.note{font-size:0.8125rem;color:var(--muted);margin-top:0.25rem}
.params{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.param{display:flex;padding:0.625rem 0.875rem;border-bottom:1px solid var(--border);font-size:0.875rem;gap:1rem;align-items:baseline}
.param:last-child{border-bottom:none}
.param-name{font-family:var(--mono);font-weight:500;color:var(--accent);min-width:160px;flex-shrink:0}
.param-desc{color:var(--muted);flex:1}
.param-default{color:#999;font-family:var(--mono);font-size:0.8125rem}
footer{border-top:1px solid var(--border);padding:1.5rem 0;text-align:center;font-size:0.8125rem;color:var(--muted)}
@media(max-width:640px){.stats{flex-direction:column;gap:0.75rem}.param{flex-direction:column;gap:0.25rem}.param-name{min-width:auto}}
`,
          }}
        />
      </head>
      <body>
        {children}
        <footer>
          <div class="container">
            &copy; 2023-PRESENT <a href="https://github.com/WuChenDi/">wudi</a>
          </div>
        </footer>
      </body>
    </html>
  )
}
