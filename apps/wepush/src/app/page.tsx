'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import { Spinner } from '@cdlab996/ui/components/spinner'
import { useQuery } from '@tanstack/react-query'
import { Bug, FileText, ListChecks, Send, Settings, Users } from 'lucide-react'
import Link from 'next/link'

interface Overview {
  users: { total: number; enabled: number }
  templates: { total: number }
  logs24h: {
    total: number
    success: number
    failed: number
    successRate: number | null
  }
  recentBatches: Array<{
    id: string
    trigger: 'manual' | 'api' | 'cron'
    status: 'running' | 'success' | 'partial' | 'failed'
    totalCount: number
    successCount: number
    failedCount: number
    startedAt: string
    finishedAt: string | null
  }>
}

async function fetchOverview(): Promise<Overview> {
  const res = await fetch('/api/stats/overview')
  if (!res.ok) throw new Error('Failed to load overview')
  return res.json()
}

function statusBadge(status: Overview['recentBatches'][number]['status']) {
  if (status === 'success') return <Badge variant="secondary">success</Badge>
  if (status === 'partial') return <Badge variant="outline">partial</Badge>
  if (status === 'failed') return <Badge variant="destructive">failed</Badge>
  return <Badge variant="outline">running</Badge>
}

export default function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
  })

  return (
    <main className="container mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">wepush</h1>
        <p className="mt-2 text-muted-foreground">微信公众号定时推送控制台</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : (
        <>
          <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="接收人"
              value={data?.users.total ?? 0}
              hint={`启用 ${data?.users.enabled ?? 0}`}
            />
            <Metric label="模板" value={data?.templates.total ?? 0} />
            <Metric
              label="近 24h 推送"
              value={data?.logs24h.total ?? 0}
              hint={
                data?.logs24h.total
                  ? `${data.logs24h.success} 成功 · ${data.logs24h.failed} 失败`
                  : '暂无推送'
              }
            />
            <Metric
              label="近 24h 成功率"
              value={
                data?.logs24h.successRate === null ||
                data?.logs24h.successRate === undefined
                  ? '—'
                  : `${data.logs24h.successRate}%`
              }
              hint={
                data?.logs24h.total ? `基于 ${data.logs24h.total} 条` : '无数据'
              }
            />
          </section>

          <section className="mb-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">最近批次</h2>
              <Link
                href="/logs"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                查看全部日志 →
              </Link>
            </div>
            {!data || data.recentBatches.length === 0 ? (
              <div className="rounded-lg border bg-card py-10 text-center text-sm text-muted-foreground">
                还没有推送批次
              </div>
            ) : (
              <ul className="divide-y rounded-lg border bg-card">
                {data.recentBatches.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/logs/batches/${b.id}`}
                      className="flex items-center justify-between px-4 py-3 transition hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3">
                        {statusBadge(b.status)}
                        <span className="font-mono text-xs text-muted-foreground">
                          {b.trigger}
                        </span>
                        <span className="text-sm">
                          {new Date(b.startedAt).toLocaleString('zh-CN', {
                            hour12: false,
                          })}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {b.successCount}/{b.totalCount} 成功
                        {b.failedCount > 0 ? ` · ${b.failedCount} 失败` : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          icon={<Users className="size-5" />}
          title="接收人"
          desc="管理订阅用户、城市、纪念日、累计日"
          href="/users"
          cta="进入"
        />
        <Card
          icon={<FileText className="size-5" />}
          title="模板"
          desc="编辑推送模板，使用模板变量动态渲染"
          href="/templates"
          cta="进入"
        />
        <Card
          icon={<ListChecks className="size-5" />}
          title="推送日志"
          desc="查看推送结果、批次、失败重试"
          href="/logs"
          cta="进入"
        />
        <Card
          icon={<Send className="size-5" />}
          title="立即推送"
          desc="跳转到接收人页面发起手动推送"
          href="/users"
          cta="去触发"
        />
        <Card
          icon={<Settings className="size-5" />}
          title="全局配置"
          desc="微信 APP_ID/SECRET、节流参数、API Token、定时推送"
          href="/settings"
          cta="打开设置"
        />
        <Card
          icon={<Bug className="size-5" />}
          title="数据源探测"
          desc="单独调用天气 / 一言 / 一句 等数据源查看原始返回"
          href="/debug"
          cta="打开"
        />
      </section>
    </main>
  )
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: number | string
  hint?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function Card({
  icon,
  title,
  desc,
  href,
  cta,
  disabled,
}: {
  icon?: React.ReactNode
  title: string
  desc: string
  href?: string
  cta?: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col rounded-lg border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="mb-6 flex-1 text-sm text-muted-foreground">{desc}</p>
      {disabled || !href ? (
        <Button disabled variant="secondary">
          待开发
        </Button>
      ) : (
        <Link href={href}>
          <Button className="w-full">{cta}</Button>
        </Link>
      )}
    </div>
  )
}
