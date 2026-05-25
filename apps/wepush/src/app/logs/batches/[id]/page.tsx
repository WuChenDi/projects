'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import { Spinner } from '@cdlab996/ui/components/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cdlab996/ui/components/table'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { LogDetailDrawer } from '@/components/LogDetailDrawer'

interface BatchSummary {
  id: string
  trigger: 'manual' | 'api' | 'cron'
  status: 'running' | 'success' | 'partial' | 'failed'
  totalCount: number
  successCount: number
  failedCount: number
  startedAt: string
  finishedAt: string | null
}

interface BatchLogRow {
  id: string
  userId: string
  userName: string | null
  templateCode: string
  status: 'success' | 'failed'
  renderedTitle: string
  errorMessage: string | null
  sentAt: string
}

interface BatchResponse {
  batch: BatchSummary
  logs: BatchLogRow[]
}

async function fetchBatch(id: string): Promise<BatchResponse> {
  const res = await fetch(`/api/batches/${id}`)
  if (!res.ok) throw new Error('Failed to load batch')
  return res.json()
}

function statusBadge(status: BatchSummary['status']) {
  if (status === 'success') return <Badge variant="secondary">success</Badge>
  if (status === 'partial') return <Badge variant="outline">partial</Badge>
  if (status === 'failed') return <Badge variant="destructive">failed</Badge>
  return <Badge variant="outline">running</Badge>
}

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [openLogId, setOpenLogId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['batch', id],
    queryFn: () => fetchBatch(id),
  })

  return (
    <main className="container mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">推送批次</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{id}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/logs">
            <Button variant="ghost" size="sm">
              返回日志
            </Button>
          </Link>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-lg border bg-card py-16 text-center text-sm text-muted-foreground">
          批次未找到
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Cell label="触发">{data.batch.trigger}</Cell>
            <Cell label="状态">{statusBadge(data.batch.status)}</Cell>
            <Cell label="开始">
              {new Date(data.batch.startedAt).toLocaleString('zh-CN', {
                hour12: false,
              })}
            </Cell>
            <Cell label="结束">
              {data.batch.finishedAt
                ? new Date(data.batch.finishedAt).toLocaleString('zh-CN', {
                    hour12: false,
                  })
                : '—'}
            </Cell>
            <Cell label="总数">{data.batch.totalCount}</Cell>
            <Cell label="成功">{data.batch.successCount}</Cell>
            <Cell label="失败">{data.batch.failedCount}</Cell>
            <Cell label="成功率">
              {data.batch.totalCount === 0
                ? '—'
                : `${Math.round(
                    (data.batch.successCount / data.batch.totalCount) * 100,
                  )}%`}
            </Cell>
          </div>

          {data.logs.length === 0 ? (
            <div className="rounded-lg border bg-card py-16 text-center text-sm text-muted-foreground">
              该批次没有日志
            </div>
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">时间</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>模板</TableHead>
                    <TableHead>标题 / 错误</TableHead>
                    <TableHead className="w-24">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => setOpenLogId(row.id)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-mono text-xs">
                        {new Date(row.sentAt).toLocaleString('zh-CN', {
                          hour12: false,
                        })}
                      </TableCell>
                      <TableCell>{row.userName || row.userId}</TableCell>
                      <TableCell className="font-mono">
                        {row.templateCode || '—'}
                      </TableCell>
                      <TableCell className="max-w-md truncate text-xs">
                        {row.status === 'failed' && row.errorMessage
                          ? row.errorMessage
                          : row.renderedTitle || '—'}
                      </TableCell>
                      <TableCell>
                        {row.status === 'success' ? (
                          <Badge variant="secondary">success</Badge>
                        ) : (
                          <Badge variant="destructive">failed</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      <LogDetailDrawer logId={openLogId} onClose={() => setOpenLogId(null)} />
    </main>
  )
}

function Cell({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  )
}
