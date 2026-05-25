'use client'

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
import { Pencil, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ConfirmDeleteButton } from '@/components/ConfirmDeleteButton'
import type { Template } from '@/database/schema'

async function fetchTemplates(): Promise<Template[]> {
  const res = await fetch('/api/templates')
  if (!res.ok) throw new Error('Failed to load templates')
  return res.json()
}

export default function TemplatesPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates,
  })

  const del = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] })
      toast.success('已删除')
    },
    onError: () => toast.error('删除失败'),
  })

  return (
    <main className="container mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">推送模板</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            支持 {`{{variable.DATA}}`} 模板变量，每位用户通过 code 关联模板。
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              返回
            </Button>
          </Link>
          <Link href="/templates/new">
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              新建模板
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
          <p className="text-sm text-muted-foreground">还没有模板</p>
          <Link href="/templates/new" className="mt-4 inline-block">
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              新建第一个模板
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>内容预览</TableHead>
                <TableHead className="w-32 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono">{t.code}</TableCell>
                  <TableCell>{t.title || '—'}</TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {t.desc || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Link href={`/templates/${t.id}`}>
                        <Button variant="ghost" size="icon" aria-label="编辑">
                          <Pencil className="size-4" />
                        </Button>
                      </Link>
                      <ConfirmDeleteButton
                        title="删除模板"
                        message={`确认删除模板 "${t.code}" ？此操作不可撤销。`}
                        onConfirm={() => del.mutate(t.id)}
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
