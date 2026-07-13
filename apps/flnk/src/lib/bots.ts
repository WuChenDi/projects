// Union of the two historical user-agent lists — the generic-bot patterns from
// analytics and the social-crawler patterns from redirect — merged as a
// superset so neither detector loses an entry it matched before. Both original
// call sites matched case-insensitively by substring (`.includes`), so a single
// matcher backs both exported predicates without changing either site's
// matching semantics.
const BOT_USER_AGENTS = [
  'bot',
  'crawler',
  'spider',
  'scraper',
  'facebook',
  'twitter',
  'linkedin',
  'telegram',
  'whatsapp',
  'discord',
  'slack',
  'googlebot',
  'bingbot',
  'yahoobot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'applebot',
  'discordbot',
  'facebot',
  'linkexpanding',
  'mastodon',
  'pinterest',
  'skypeuripreview',
  'slackbot',
  'slackbot-linkexpanding',
  'snapchat',
  'telegrambot',
  'tiktok',
] as const

function matchesBotList(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return BOT_USER_AGENTS.some((pattern) => ua.includes(pattern))
}

// Generic bot/crawler detection for analytics (was analytics.ts `isBot`).
export function isBot(userAgent: string): boolean {
  return matchesBotList(userAgent)
}

// Social-crawler detection for OG serving on redirects (was redirect.ts
// `isSocialCrawler`). Shares the union list + substring match above.
export function isSocialCrawler(ua: string): boolean {
  return matchesBotList(ua)
}
