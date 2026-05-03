function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function generateOgPageHtml(targetUrl: string): string {
  const escapedUrl = escapeHtml(targetUrl)

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@cdlab/shortener</title>
    <meta property="og:url" content="${escapedUrl}" />
    <meta property="og:type" content="website" />
    <meta name="robots" content="noindex, nofollow" />
    <script>
      window.location.replace('${escapedUrl}');
    </script>
    <noscript>
      <meta http-equiv="refresh" content="0;url=${escapedUrl}" />
    </noscript>
  </head>
  <body>
    <p>Redirecting to <a href="${escapedUrl}">${escapedUrl}</a>...</p>
  </body>
</html>`
}
