import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@cdlab996/ui/components/accordion'
import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import { GitHubIcon as Github } from '@cdlab996/ui/icon'
import GradientText from '@cdlab996/ui/reactbits/GradientText'
import ShinyText from '@cdlab996/ui/reactbits/ShinyText'
import SpotlightCard from '@cdlab996/ui/reactbits/SpotlightCard'
import {
  AlarmClock,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Check,
  CloudSun,
  FileText,
  FolderGit2,
  Gift,
  Heart,
  KeyRound,
  MessageSquareText,
  ScrollText,
  Send,
  Users,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ThemeToggle } from '@/components/layout/theme-toggle'

const BRAND = 'wepush'
const GITHUB_HREF = 'https://github.com/WuChenDi/projects/tree/main/apps/wepush'
const SITE_IMAGE =
  'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/wepush/index.png'

const FEATURES = [
  {
    icon: Users,
    title: '多接收人管理',
    desc: '为每个接收人单独配置城市、纪念日与模板变量，集中维护推送名单。',
    spotlight: 'rgba(99, 102, 241, 0.25)' as const,
  },
  {
    icon: FileText,
    title: '可视化模板',
    desc: '在界面中编辑 {{var.DATA}} 模板与颜色，无需改代码即可调整推送内容。',
    spotlight: 'rgba(236, 72, 153, 0.25)' as const,
  },
  {
    icon: CalendarClock,
    title: '定时与农历',
    desc: '基于 Cron 定时推送，内置公历 / 农历纪念日倒数，自动换算下一次发送日期。',
    spotlight: 'rgba(34, 197, 94, 0.25)' as const,
  },
  {
    icon: CloudSun,
    title: '内置数据源',
    desc: '天气、一言、每日英语等数据源开箱即用，自动注入到模板变量中。',
    spotlight: 'rgba(14, 165, 233, 0.25)' as const,
  },
  {
    icon: ScrollText,
    title: '推送日志',
    desc: '按批次记录每次推送的成功 / 失败明细，支持重试与详情追踪。',
    spotlight: 'rgba(245, 158, 11, 0.25)' as const,
  },
  {
    icon: KeyRound,
    title: '访问控制',
    desc: '密码门保护控制台，推送接口由独立 Token 鉴权，配置项安全存储。',
    spotlight: 'rgba(168, 85, 247, 0.25)' as const,
  },
]

const STEPS = [
  {
    title: '配置公众号',
    desc: '在设置中填入测试号 AppID / AppSecret，建立与微信的连接。',
  },
  {
    title: '添加接收人与模板',
    desc: '维护接收人名单，绑定模板与个性化变量（城市、纪念日等）。',
  },
  {
    title: '设置定时任务',
    desc: '开启 Cron 定时，或随时手动 / 通过 API 触发一次推送。',
  },
  {
    title: '查看推送结果',
    desc: '在日志中查看每个批次的发送明细，失败可一键重试。',
  },
]

const MESSAGE_LINES = [
  { label: '城市', value: '杭州 · 多云', color: 'text-sky-500' },
  { label: '气温', value: '18 ~ 26℃', color: 'text-amber-500' },
  { label: '农历', value: '五月初七', color: 'text-emerald-500' },
  { label: '在一起', value: '已经 1024 天', color: 'text-rose-500' },
  { label: '距生日', value: '还有 12 天', color: 'text-rose-500' },
  {
    label: '每日一言',
    value: '愿你被这个世界温柔以待。',
    color: 'text-primary',
  },
  {
    label: 'English',
    value: 'Stay hungry, stay foolish.',
    color: 'text-primary',
  },
]

const USE_CASES = [
  {
    icon: Heart,
    title: '给家人 / 恋人',
    desc: '每天清晨送上问候，附带天气、纪念日倒数与暖心一言。',
    spotlight: 'rgba(236, 72, 153, 0.25)' as const,
  },
  {
    icon: Gift,
    title: '纪念日不遗忘',
    desc: '公历 / 农历纪念日自动倒数，重要的日子提前提醒。',
    spotlight: 'rgba(34, 197, 94, 0.25)' as const,
  },
  {
    icon: AlarmClock,
    title: '个人提醒',
    desc: '给自己推送天气、待办与每日英语，开启自律的一天。',
    spotlight: 'rgba(99, 102, 241, 0.25)' as const,
  },
]

const OLD_WAY = [
  '配置写死在代码 / 环境变量里',
  '改一次推送内容就要改代码并重新部署',
  '多账号、多模板难以维护',
  '没有推送记录，失败难以排查',
]

const NEW_WAY = [
  '接收人 / 模板 / 设置全部入库，界面直接编辑',
  '改完即时生效，无需重新部署',
  '多接收人、多模板各自独立配置',
  '批次日志可视化，失败一键重试',
]

const FAQS = [
  {
    q: '需要自己的服务器吗？',
    a: '不需要。部署在 Cloudflare Workers（OpenNext），数据存 D1，零运维、零账单门槛。',
  },
  {
    q: '支持哪些消息类型？',
    a: '微信公众号测试号的模板消息，支持 {{var.DATA}} 变量替换与颜色样式。',
  },
  {
    q: '推送的数据从哪来？',
    a: '内置天气、一言、每日英语等数据源，按每个接收人的配置自动注入到模板变量。',
  },
  {
    q: '怎么实现定时？',
    a: '基于 Cloudflare Cron 定时触发，也支持手动 / API 触发，并可随时暂停或恢复。',
  },
  {
    q: '数据安全吗？',
    a: '控制台有密码门，推送接口独立 Token 鉴权，AppSecret 等敏感项在接口返回时自动脱敏。',
  },
]

const STACK = [
  'Next.js',
  'Cloudflare Workers',
  'D1',
  'Drizzle ORM',
  'OpenNext',
  'Cron Triggers',
]

const FOOTER_COLUMNS = [
  {
    title: '控制台',
    links: [
      { label: '概览', href: '/dashboard', icon: BarChart3, external: false },
      {
        label: '接收人',
        href: '/dashboard/users',
        icon: Users,
        external: false,
      },
      {
        label: '模板',
        href: '/dashboard/templates',
        icon: FileText,
        external: false,
      },
      {
        label: '日志',
        href: '/dashboard/logs',
        icon: ScrollText,
        external: false,
      },
    ],
  },
  {
    title: '资源',
    links: [
      { label: 'GitHub', href: GITHUB_HREF, icon: Github, external: true },
      {
        label: '项目主页',
        href: 'https://github.com/WuChenDi/projects',
        icon: FolderGit2,
        external: true,
      },
    ],
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-20 w-full max-w-6xl shrink-0 items-center justify-between gap-2 px-4 md:px-6">
        <Link href="/" className="flex items-center font-semibold">
          <Image
            src="https://wcd.pages.dev/logo.png"
            alt="wepush logo"
            width={32}
            height={32}
            className="mr-2 rounded-full"
            unoptimized
          />
          {BRAND}
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="icon" aria-label="GitHub">
            <a href={GITHUB_HREF} target="_blank" rel="noopener noreferrer">
              <Github className="size-4" />
            </a>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard">
              进入控制台
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center md:px-6 md:py-24">
          <Badge variant="outline" className="mb-6">
            微信公众号 · 模板消息推送
          </Badge>
          <GradientText
            className="text-4xl font-bold tracking-tight md:text-6xl"
            colors={['#6366F1', '#EC4899', '#22D3EE', '#6366F1']}
            animationSpeed={10}
          >
            把每日提醒交给 wepush
          </GradientText>
          <div className="mx-auto mt-6 max-w-2xl">
            <ShinyText
              text="多接收人、多模板、农历纪念日、天气与每日一言，全部在界面中配置，到点自动发送。"
              speed={4}
              className="text-base md:text-lg"
            />
          </div>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                进入控制台
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={GITHUB_HREF} target="_blank" rel="noopener noreferrer">
                <Github className="size-4" />
                查看源码
              </a>
            </Button>
          </div>

          <div className="mx-auto mt-16 max-w-5xl overflow-hidden rounded-xl border bg-card shadow-xl">
            <Image
              src={SITE_IMAGE}
              alt="wepush 控制台预览"
              width={1600}
              height={900}
              className="h-auto w-full"
              unoptimized
              priority
            />
          </div>
        </section>

        {/* Features */}
        <section className="relative border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                核心能力
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                推送链路上需要的能力，开箱即用
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => {
                const Icon = f.icon
                return (
                  <SpotlightCard
                    key={f.title}
                    spotlightColor={f.spotlight}
                    className="border-border bg-card"
                  >
                    <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4.5" />
                    </div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {f.desc}
                    </p>
                  </SpotlightCard>
                )
              })}
            </div>
          </div>
        </section>

        {/* Message preview */}
        <section className="border-t">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-6 md:py-20">
            <div>
              <Badge variant="outline" className="mb-4">
                推送内容预览
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                一条消息，说清今天的一切
              </h2>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                把天气、农历、纪念日倒数、每日一言与英语组合成一条模板消息，
                变量自动替换、关键字段着色。每个接收人都能收到专属于自己的内容。
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquareText className="size-4 text-primary" />
                变量随接收人配置动态生成
              </div>
            </div>

            <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border bg-card shadow-xl">
              <div className="flex items-center gap-2 border-b bg-primary/5 px-5 py-3">
                <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Send className="size-3.5" />
                </span>
                <span className="text-sm font-semibold">今日提醒</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  07:30
                </span>
              </div>
              <div className="divide-y">
                {MESSAGE_LINES.map((line) => (
                  <div
                    key={line.label}
                    className="flex items-baseline gap-3 px-5 py-2.5 text-sm"
                  >
                    <span className="w-16 shrink-0 text-muted-foreground">
                      {line.label}
                    </span>
                    <span className={`font-medium ${line.color}`}>
                      {line.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t bg-muted/30 px-5 py-2.5 text-center text-xs text-muted-foreground">
                来自 wepush 的每日推送
              </div>
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                适用场景
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                日复一日的提醒，交给它自动完成
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {USE_CASES.map((u) => {
                const Icon = u.icon
                return (
                  <SpotlightCard
                    key={u.title}
                    spotlightColor={u.spotlight}
                    className="border-border bg-card"
                  >
                    <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4.5" />
                    </div>
                    <h3 className="font-semibold">{u.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {u.desc}
                    </p>
                  </SpotlightCard>
                )
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="relative border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                四步开始推送
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                从接入公众号到自动发送，只需几分钟
              </p>
            </div>
            <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <SpotlightCard
                  key={s.title}
                  spotlightColor="rgba(255, 255, 255, 0.18)"
                  className="border-border bg-card"
                >
                  <div className="mb-3 inline-flex items-center justify-center text-primary">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="mt-2 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {s.desc}
                  </p>
                </SpotlightCard>
              ))}
            </ol>
          </div>
        </section>

        {/* Comparison */}
        <section className="border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                告别青龙脚本
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                从写死配置的脚本，升级为可视化推送控制台
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-xl border bg-card p-6">
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-muted-foreground">
                  <X className="size-4" />
                  以前：ALL_CONFIG + 青龙脚本
                </h3>
                <ul className="space-y-3">
                  {OLD_WAY.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground"
                    >
                      <X className="mt-0.5 size-4 shrink-0 text-destructive/70" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-primary/30 bg-card p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <Check className="size-4 text-primary" />
                  现在：wepush 控制台
                </h3>
                <ul className="space-y-3">
                  {NEW_WAY.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] md:gap-12">
              <div className="md:sticky md:top-24 md:self-start">
                <h2 className="text-balance text-2xl font-bold tracking-tight md:text-3xl">
                  常见问题
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  关于部署、推送与安全的快速解答。
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {STACK.map((tech) => (
                    <Badge
                      key={tech}
                      variant="secondary"
                      className="font-normal"
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
              <Accordion type="single" collapsible className="border-t">
                {FAQS.map((item) => (
                  <AccordionItem key={item.q} value={item.q}>
                    <AccordionTrigger>{item.q}</AccordionTrigger>
                    <AccordionContent>{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center md:px-6 md:py-20">
            <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Send className="size-5" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              准备好发送第一条推送了吗？
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              进入控制台查看实时概览、配置接收人与模板，立即体验自动推送。
            </p>
            <div className="mt-7 flex items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  进入控制台
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard">
                  <BarChart3 className="size-4" />
                  查看概览
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
          <div className="flex flex-col justify-between gap-12 py-12 md:flex-row md:py-16">
            <div className="flex max-w-sm flex-col gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="https://wcd.pages.dev/logo.png"
                  alt="wepush logo"
                  width={28}
                  height={28}
                  className="rounded-full"
                  unoptimized
                />
                <span className="text-2xl font-semibold tracking-tight">
                  wepush
                </span>
              </Link>
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground/75">
                微信公众号模板消息定时推送控制台 —
                多接收人、多模板、农历纪念日，到点自动发送。
              </p>
              <p className="text-xs text-muted-foreground/60">
                Cloudflare Workers powered · 零运维部署
              </p>
            </div>

            <div className="flex gap-12 sm:gap-16 md:gap-20">
              {FOOTER_COLUMNS.map((column) => (
                <div key={column.title} className="flex flex-col gap-3">
                  <span className="text-sm font-medium text-muted-foreground/60">
                    {column.title}
                  </span>
                  <ul className="flex flex-col gap-3">
                    {column.links.map((link) => {
                      const Icon = link.icon
                      return (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="flex items-center gap-2 text-sm text-muted-foreground/75 transition-colors hover:text-foreground"
                            {...(link.external
                              ? {
                                  target: '_blank',
                                  rel: 'noopener noreferrer',
                                }
                              : {})}
                          >
                            <Icon className="size-4" />
                            {link.label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t py-6 text-xs text-muted-foreground/60 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © Copyright 2026-PRESENT,{' '}
              <Link
                href="https://github.com/WuChenDi"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                wudi
              </Link>
              . All Rights Reserved.
            </p>
            <span>Built with Next.js · Cloudflare Workers</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
