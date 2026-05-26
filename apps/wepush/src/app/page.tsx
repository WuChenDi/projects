'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Label } from '@cdlab996/ui/components/label'
import { Spinner } from '@cdlab996/ui/components/spinner'
import { IKEmpty, IKPageContainer } from '@cdlab996/ui/IK'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRightIcon,
  Bug,
  FileSearchCorner,
  FileText,
  ListChecks,
  Minus,
  Send,
  Settings,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
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

interface MetricProps {
  label: string
  value: number | string
  hint?: string
  trend?: {
    direction: 'up' | 'down' | 'flat'
    label: string
    value?: string
  }
}

function Metric({ label, value, hint, trend }: MetricProps) {
  const TrendIcon =
    trend?.direction === 'up'
      ? TrendingUp
      : trend?.direction === 'down'
        ? TrendingDown
        : Minus

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        {trend?.value && (
          <CardAction>
            <Badge variant="outline">
              <TrendIcon className="size-3" />
              {trend.value}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {trend && (
          <div className="line-clamp-1 flex gap-2 font-medium">
            {trend.label}
            <TrendIcon className="size-4" />
          </div>
        )}
        {hint && <div className="text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  )
}

function NavCard({
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
    <Card>
      <CardHeader className="flex items-center">
        {icon}
        {title}
      </CardHeader>
      <CardContent>
        <p className="mb-6 text-muted-foreground">{desc}</p>
        {disabled || !href ? (
          <Button disabled variant="secondary">
            待开发
          </Button>
        ) : (
          <Link href={href}>
            <Button className="w-full">{cta}</Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

export default function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
  })

  return (
    <IKPageContainer className="flex-col max-w-6xl mx-auto">
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
          <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
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
              trend={
                data?.logs24h.total
                  ? {
                      direction: data.logs24h.failed > 0 ? 'down' : 'up',
                      label:
                        data.logs24h.failed > 0
                          ? '存在失败推送'
                          : '推送全部成功',
                      value: `${data.logs24h.success}/${data.logs24h.total}`,
                    }
                  : undefined
              }
            />
            <Metric
              label="近 24h 成功率"
              value={
                data?.logs24h.successRate == null
                  ? '—'
                  : `${data.logs24h.successRate}%`
              }
              hint={
                data?.logs24h.total ? `基于 ${data.logs24h.total} 条` : '无数据'
              }
              trend={
                data?.logs24h.successRate != null
                  ? {
                      direction: data.logs24h.successRate >= 90 ? 'up' : 'down',
                      label:
                        data.logs24h.successRate >= 90
                          ? '成功率良好'
                          : '成功率偏低',
                      value: `${data.logs24h.successRate}%`,
                    }
                  : undefined
              }
            />
          </section>

          <section className="mb-10">
            <div className="mb-3 flex items-center justify-between">
              <Label>最近批次</Label>
              <Link
                href="/logs"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                查看全部日志 <ArrowRightIcon className="size-3" />
              </Link>
            </div>
            {!data || data.recentBatches.length === 0 ? (
              <IKEmpty
                icon={FileSearchCorner}
                className="border border-dashed"
                title="暂无推送批次数据"
              />
            ) : (
              <ul className="divide-y rounded-xl border bg-card shadow-xs">
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
        <NavCard
          icon={<Users className="size-4" />}
          title="接收人"
          desc="管理订阅用户、城市、纪念日、累计日"
          href="/users"
          cta="进入"
        />
        <NavCard
          icon={<FileText className="size-4" />}
          title="模板"
          desc="编辑推送模板，使用模板变量动态渲染"
          href="/templates"
          cta="进入"
        />
        <NavCard
          icon={<ListChecks className="size-4" />}
          title="推送日志"
          desc="查看推送结果、批次、失败重试"
          href="/logs"
          cta="进入"
        />
        <NavCard
          icon={<Send className="size-4" />}
          title="立即推送"
          desc="跳转到接收人页面发起手动推送"
          href="/users"
          cta="去触发"
        />
        <NavCard
          icon={<Settings className="size-4" />}
          title="全局配置"
          desc="微信 APP_ID/SECRET、节流参数、API Token、定时推送"
          href="/settings"
          cta="打开设置"
        />
        <NavCard
          icon={<Bug className="size-4" />}
          title="数据源探测"
          desc="单独调用天气 / 一言 / 一句 等数据源查看原始返回"
          href="/debug"
          cta="打开"
        />
      </section>
    </IKPageContainer>
  )
}
