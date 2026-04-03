import type { FC, PropsWithChildren } from 'hono/jsx'

interface LayoutProps {
  title?: string
  description?: string
  keywords?: string
  canonicalUrl?: string
  ogImage?: string
  ogType?: 'website' | 'article'
}

const SITE_URL = 'https://live-user.cdlab.workers.dev'
const SITE_NAME = 'LiveUser'
const DEFAULT_OG_IMAGE = 'https://notes-wudi.pages.dev/images/logo.png'

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  title = 'LiveUser',
  description = "Real-time online user counter. Drop a script tag, see who's here.",
  keywords = 'live user counter, real-time analytics, online users, website traffic, SSE, script tag, visitor counter',
  canonicalUrl = '/',
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  children,
}) => {
  const fullTitle = title === 'LiveUser' ? title : `${title} - LiveUser`
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
        <meta name="revisit-after" content="3 days" />
        <meta name="distribution" content="global" />
        <meta name="rating" content="general" />

        {/* Author / Publisher */}
        <meta name="author" content="wudi" />
        <meta name="creator" content="wudi" />
        <meta name="publisher" content="wudi" />
        <meta name="copyright" content="© 2025 wudi. All rights reserved." />

        {/* App / Category */}
        <meta name="application-name" content={SITE_NAME} />
        <meta name="category" content="Developer Tools, Analytics, Real-time" />
        <meta
          name="classification"
          content="Developer Tools, Web Analytics, Real-time Monitoring"
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
              potentialAction: {
                '@type': 'SearchAction',
                target: `${SITE_URL}/search?q={search_term_string}`,
                'query-input': 'required name=search_term_string',
              },
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
              browserRequirements:
                'Requires JavaScript. Compatible with Chrome 90+, Firefox 88+, Safari 14+, Edge 90+',
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
              keywords:
                'live user counter, real-time analytics, SSE, online users, website traffic, script tag',
              screenshot: {
                '@type': 'ImageObject',
                contentUrl: DEFAULT_OG_IMAGE,
                description:
                  'LiveUser - Real-time online user counter interface',
              },
              softwareVersion: '1.0.0',
              featureList: [
                'Real-time online user counting via SSE',
                'One-line script tag integration',
                'Total visit count tracking',
                'Multi-site support via siteId',
                'Customizable display element',
                'Auto-reconnect on disconnect',
                'Debug mode for development',
                'Zero-dependency embed script',
              ],
              sameAs: [
                'https://github.com/WuChenDi',
                'https://x.com/wuchendi96',
              ],
            }),
          }}
        />

        {/* JSON-LD: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'wudi',
              url: 'https://github.com/WuChenDi',
              logo: DEFAULT_OG_IMAGE,
              foundingDate: '2025',
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
:root{--bg:#fafafa;--fg:#111;--muted:#666;--border:#e5e5e5;--accent:#2563eb;--accent-light:#eff6ff;--radius:6px;--mono:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
body{font-family:var(--sans);background:var(--bg);color:var(--fg);line-height:1.6;min-height:100vh;display:flex;flex-direction:column}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
code,pre{font-family:var(--mono);font-size:0.875rem}
pre{background:#1e1e1e;color:#d4d4d4;padding:1rem;border-radius:var(--radius);overflow-x:auto;line-height:1.5}
.container{max-width:720px;margin:0 auto;padding:0 1.5rem;width:100%}
.header{padding:2rem 0;border-bottom:1px solid var(--border)}
.header h1{font-size:1.5rem;font-weight:600;letter-spacing:-0.02em}
.header p{color:var(--muted);margin-top:0.25rem;font-size:0.9375rem}
main{flex:1;padding:2rem 0}
.stats{display:flex;gap:2rem;margin:1.5rem 0;flex-wrap:wrap}
.stat{display:flex;align-items:baseline;gap:0.5rem}
.stat-label{font-size:0.875rem;color:var(--muted)}
.stat-value{font-size:1.25rem;font-weight:600;font-variant-numeric:tabular-nums}
section{margin-bottom:2.5rem}
section h2{font-size:1.125rem;font-weight:600;margin-bottom:0.75rem}
section p{color:var(--muted);font-size:0.9375rem;margin-bottom:1rem}
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
            &copy; 2025-PRESENT <a href="https://github.com/WuChenDi/">wudi</a>
          </div>
        </footer>
      </body>
    </html>
  )
}
