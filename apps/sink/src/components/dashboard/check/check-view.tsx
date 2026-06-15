'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cdlab996/ui/components/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@cdlab996/ui/components/tabs'
import { useMutation } from '@tanstack/react-query'
import { Play } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import type { CheckResult } from '@/lib/api'
import { checkApi } from '@/lib/api'

type Verdict = 'ok' | 'broken' | 'unsafe'

function verdictOf(r: CheckResult): Verdict {
  if (r.unsafe === true) return 'unsafe'
  if (!r.ok) return 'broken'
  return 'ok'
}

const TABS: ('all' | Verdict)[] = ['all', 'ok', 'broken', 'unsafe']
const BADGE: Record<Verdict, 'default' | 'secondary' | 'destructive'> = {
  ok: 'secondary',
  broken: 'destructive',
  unsafe: 'destructive',
}

export function CheckView() {
  const t = useTranslations('check')
  const [tab, setTab] = useState<'all' | Verdict>('all')

  const run = useMutation({
    mutationFn: () => checkApi.run(),
    onError: (e: Error) => toast.error(e.message),
  })

  const results = run.data?.results ?? []
  const counts = {
    all: results.length,
    ok: results.filter((r) => verdictOf(r) === 'ok').length,
    broken: results.filter((r) => verdictOf(r) === 'broken').length,
    unsafe: results.filter((r) => verdictOf(r) === 'unsafe').length,
  }
  const filtered =
    tab === 'all' ? results : results.filter((r) => verdictOf(r) === tab)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={() => run.mutate()} disabled={run.isPending}>
          <Play className="mr-1 size-4" />
          {run.isPending ? t('running') : t('run')}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | Verdict)}>
            <TabsList>
              {TABS.map((tabKey) => (
                <TabsTrigger key={tabKey} value={tabKey}>
                  {t(`tabs.${tabKey}`)} ({counts[tabKey]})
                </TabsTrigger>
              ))}
            </TabsList>
            {TABS.map((tabKey) => (
              <TabsContent key={tabKey} value={tabKey} />
            ))}
          </Tabs>
          <CardTitle className="sr-only">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              {run.isPending ? t('running') : t('empty')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.slug')}</TableHead>
                  <TableHead>{t('table.url')}</TableHead>
                  <TableHead className="w-20">{t('table.status')}</TableHead>
                  <TableHead className="w-24">{t('table.verdict')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const v = verdictOf(r)
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">/{r.slug}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-muted-foreground">
                        {r.url}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {r.status ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={BADGE[v]}>{t(`verdict.${v}`)}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
