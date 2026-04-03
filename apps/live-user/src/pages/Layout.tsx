import type { FC, PropsWithChildren } from 'hono/jsx'

interface LayoutProps {
  title?: string
  description?: string
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  title = 'LiveUser',
  description = 'Real-time online user counter for any website',
  children,
}) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <link
          rel="icon"
          type="image/png"
          href="https://notes-wudi.pages.dev/images/logo.png"
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
            &copy; 2025-PRESENT{' '}
            <a href="https://github.com/WuChenDi/">wudi</a>
          </div>
        </footer>
      </body>
    </html>
  )
}
