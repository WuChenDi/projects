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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Send, Trash2, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ConfirmDeleteButton } from '@/components/ConfirmDeleteButton'
import type { User } from '@/database/schema'
import { runPushFromUi } from '@/lib/push-client'

async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/users')
  if (!res.ok) throw new Error('Failed to load users')
  return res.json()
}

export default function UsersPage() {
  const qc = useQueryClient()
  const router = useRouter()
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  const del = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('已删除')
    },
    onError: () => toast.error('删除失败'),
  })

  const push = useMutation({
    mutationFn: async (userIds?: string[]) =>
      runPushFromUi({ userIds, trigger: 'manual' }),
    onSuccess: (result) => {
      if (result.failedCount === 0) {
        toast.success(`推送完成（${result.successCount} 成功）`, {
          action: {
            label: '查看批次',
            onClick: () => router.push(`/logs/batches/${result.batchId}`),
          },
        })
      } else {
        toast.warning(
          `部分失败（${result.successCount} 成功 / ${result.failedCount} 失败）`,
          {
            action: {
              label: '查看批次',
              onClick: () => router.push(`/logs/batches/${result.batchId}`),
            },
          },
        )
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <main className="container mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">接收人</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            微信测试号订阅者，含城市、纪念日、累计日配置。
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              返回
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            disabled={push.isPending || !data || data.length === 0}
            onClick={() => push.mutate(undefined)}
          >
            <Zap className="mr-1 size-4" />
            {push.isPending ? '推送中...' : '推送全部'}
          </Button>
          <Link href="/users/new">
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              新建接收人
            </Button>
          </Link>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-lg border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">还没有接收人</p>
          <Link href="/users/new" className="mt-4 inline-block">
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              新建第一位接收人
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>昵称</TableHead>
                <TableHead>OpenID</TableHead>
                <TableHead>模板</TableHead>
                <TableHead>城市</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-32 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name || '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {u.wechatOpenId || '—'}
                  </TableCell>
                  <TableCell className="font-mono">
                    {u.templateCode || '—'}
                  </TableCell>
                  <TableCell>{u.city || '—'}</TableCell>
                  <TableCell>
                    {u.enabled ? (
                      <Badge variant="secondary">启用</Badge>
                    ) : (
                      <Badge variant="outline">停用</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="立即推送"
                        title="立即推送"
                        disabled={push.isPending || !u.enabled}
                        onClick={() => push.mutate([u.id])}
                      >
                        <Send className="size-4" />
                      </Button>
                      <Link href={`/users/${u.id}`}>
                        <Button variant="ghost" size="icon" aria-label="编辑">
                          <Pencil className="size-4" />
                        </Button>
                      </Link>
                      <ConfirmDeleteButton
                        title="删除接收人"
                        message={`确认删除 "${u.name || u.id}" ？此操作不可撤销。`}
                        onConfirm={() => del.mutate(u.id)}
                        disabled={del.isPending}
                      >
                        <Trash2 className="size-4" />
                      </ConfirmDeleteButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  )
}
