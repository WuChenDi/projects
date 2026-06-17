import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import { IKPageContainer } from '@cdlab996/ui/IK'
import { GitHubIcon as Github } from '@cdlab996/ui/icon'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Globe2,
  LineChart,
  Lock,
  PlusCircle,
  Route,
  ShieldCheck,
  Wand2,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Faq } from '@/components/landing/faq'
import { LocaleSwitcher, SinkLogo, ThemeToggle } from '@/components/layout'
import { getConfig } from '@/lib/env'

const GITHUB_HREF = 'https://github.com/WuChenDi/projects/tree/main/apps/sink'
const AUTHOR_HREF = 'https://github.com/WuChenDi'

export default async function LandingPage() {
  // When HOME_URL is configured, the root path redirects there instead of
  // rendering the landing page (matches the original Sink behaviour).
  const { homeURL } = getConfig()
  if (homeURL) redirect(homeURL)

  const t = await getTranslations('landing')
  const tc = await getTranslations('common')

  const features = [
    { key: 'geo', icon: Globe2 },
    { key: 'analytics', icon: BarChart3 },
    { key: 'privacy', icon: Lock },
    { key: 'ai', icon: Wand2 },
    { key: 'realtime', icon: Activity },
    { key: 'health', icon: ShieldCheck },
  ] as const

  const stats = ['runtime', 'license', 'tracking'] as const
  const logos = [
    'Next.js',
    'Cloudflare Workers',
    'Analytics Engine',
    'Workers KV',
  ]

  const steps = [
    { key: 'create', icon: PlusCircle },
    { key: 'route', icon: Route },
    { key: 'track', icon: LineChart },
  ] as const

  const faqKeys = ['cost', 'data', 'geo', 'privacy', 'auth'] as const
  const faqItems = faqKeys.map((k) => ({
    q: t(`faq.items.${k}.q`),
    a: t(`faq.items.${k}.a`),
  }))

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-20 w-full max-w-6xl shrink-0 items-center justify-between gap-2 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <SinkLogo className="size-4" />
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

      <IKPageContainer>
        <div className="mx-auto w-full max-w-6xl">
          {/* Hero */}
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
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
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

          {/* Stats */}
          <section className="border-t py-16 md:py-20">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                {t('stats.title')}
              </h2>
              <p className="mt-3 text-muted-foreground">
                {t('stats.subtitle')}
              </p>
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

          {/* Features */}
          <section className="border-t py-16 md:py-20">
            <h2 className="mb-10 text-center text-2xl font-bold tracking-tight md:text-3xl">
              {t('featuresTitle')}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => {
                const Icon = f.icon
                return (
                  <div
                    key={f.key}
                    className="rounded-xl border bg-card p-6 text-left transition-colors hover:border-primary/30"
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

          {/* How it works */}
          <section className="border-t py-16 md:py-20">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                {t('steps.title')}
              </h2>
              <p className="mt-3 text-muted-foreground">
                {t('steps.subtitle')}
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map((step, i) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.key}
                    className="relative rounded-xl border bg-card p-6"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <span className="font-mono text-4xl font-bold text-muted-foreground/15">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 font-semibold">
                      {t(`steps.items.${step.key}.title`)}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {t(`steps.items.${step.key}.desc`)}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Tech logos */}
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

          {/* FAQ */}
          <section className="grid gap-8 border-t py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-12 md:py-20">
            <div className="md:sticky md:top-6 md:self-start">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                {t('faq.title')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t('faq.subtitle')}
              </p>
            </div>
            <Faq items={faqItems} />
          </section>

          {/* CTA */}
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
          <footer className="mt-8 border-t pt-12">
            <div className="flex flex-col gap-10 md:flex-row md:justify-between">
              <div className="max-w-xs space-y-3">
                <Link
                  href="/"
                  className="flex items-center gap-2 font-semibold"
                >
                  <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <SinkLogo className="size-4" />
                  </span>
                  {tc('appName')}
                </Link>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t('footer.blurb')}
                </p>
              </div>

              <div className="flex flex-wrap gap-x-16 gap-y-10">
                <nav className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    {t('footer.product')}
                  </p>
                  <ul className="space-y-2.5 text-sm">
                    <li>
                      <Link
                        href="/dashboard"
                        className="text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {t('footer.dashboard')}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/analytics"
                        className="text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {tc('appName')} Analytics
                      </Link>
                    </li>
                  </ul>
                </nav>

                <nav className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    {t('footer.resources')}
                  </p>
                  <ul className="space-y-2.5 text-sm">
                    <li>
                      <a
                        href={GITHUB_HREF}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-foreground/80 transition-colors hover:text-foreground"
                      >
                        <Github className="size-4" />
                        {t('footer.source')}
                      </a>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/privacy"
                        className="text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {t('footer.privacy')}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/terms"
                        className="text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {t('footer.terms')}
                      </Link>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                © {new Date().getFullYear()}-PRESENT ·{' '}
                <a
                  href={AUTHOR_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground hover:underline"
                >
                  wudi
                </a>
              </span>
              <span className="font-mono text-muted-foreground/70">
                {t('footer.builtWith')}
              </span>
            </div>
          </footer>
        </div>
      </IKPageContainer>
    </div>
  )
}
