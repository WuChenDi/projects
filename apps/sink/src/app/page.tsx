import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import { GitHubIcon as Github } from '@cdlab996/ui/icon'
import { ArrowRight, Globe2, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { LocaleSwitcher, ThemeToggle } from '@/components/layout'
import { getConfig } from '@/lib/env'

const GITHUB_HREF = 'https://github.com/WuChenDi/projects/tree/main/apps/sink'

export default async function LandingPage() {
  // When HOME_URL is configured, the root path redirects there instead of
  // rendering the landing page (matches the original Sink behaviour).
  const { homeURL } = getConfig()
  if (homeURL) redirect(homeURL)

  const t = await getTranslations('landing')
  const tc = await getTranslations('common')

  const features = [
    { key: 'geo', icon: Globe2 },
    { key: 'analytics', icon: Sparkles },
    { key: 'privacy', icon: ShieldCheck },
  ] as const

  const stats = ['runtime', 'license', 'tracking'] as const
  const logos = [
    'Next.js',
    'Cloudflare Workers',
    'Analytics Engine',
    'Workers KV',
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-20 w-full max-w-6xl shrink-0 items-center justify-between gap-2 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ArrowRight className="size-4" />
          </span>
          {tc('appName')}
        </Link>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button asChild variant="outline" size="icon" aria-label="GitHub">
            <a href={GITHUB_HREF} target="_blank" rel="noopener noreferrer">
              <Github className="size-4" />
            </a>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard">
              {tc('enterDashboard')}
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 md:px-6">
        <section className="py-16 text-center md:py-24">
          <Badge variant="outline" className="mb-6">
            {t('badge')}
          </Badge>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight md:text-6xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            {t('subtitle')}
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                {t('getStarted')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={GITHUB_HREF} target="_blank" rel="noopener noreferrer">
                <Github className="size-4" />
                {tc('viewSource')}
              </a>
            </Button>
          </div>
        </section>

        <section className="border-t py-16 md:py-20">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight md:text-3xl">
            {t('featuresTitle')}
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.key}
                  className="rounded-xl border bg-card p-6 text-left"
                >
                  <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4.5" />
                  </div>
                  <h3 className="font-semibold">
                    {t(`features.${f.key}.title`)}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {t(`features.${f.key}.desc`)}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="border-t py-16 md:py-20">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              {t('stats.title')}
            </h2>
            <p className="mt-3 text-muted-foreground">{t('stats.subtitle')}</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {stats.map((key) => (
              <div key={key} className="text-center">
                <div className="text-4xl font-bold tracking-tight md:text-5xl">
                  {t(`stats.items.${key}.value`)}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t(`stats.items.${key}.label`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t py-12 md:py-16">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
            {t('logos.title')}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-lg font-semibold text-muted-foreground">
            {logos.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </section>

        <section className="border-t py-16 text-center md:py-24">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight md:text-4xl">
            {t('cta.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {t('cta.subtitle')}
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/dashboard">
                {t('cta.button')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 text-xs text-muted-foreground md:px-6">
          <span>{tc('tagline')}</span>
          <span>Built with Next.js · Cloudflare Workers</span>
        </div>
      </footer>
    </div>
  )
}
