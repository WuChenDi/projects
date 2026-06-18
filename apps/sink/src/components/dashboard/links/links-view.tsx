'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Input } from '@cdlab996/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cdlab996/ui/components/select'
import { Spinner } from '@cdlab996/ui/components/spinner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  QrCode,
  Search,
  Trash2,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DeleteDialog } from '@/components/dashboard/links/delete-dialog'
import { LinkDrawer } from '@/components/dashboard/links/link-drawer'
import { QrPopover } from '@/components/dashboard/links/qr-popover'
import type { LinkRow, SortKey } from '@/lib/api'
import { linkApi } from '@/lib/api'
import { buildShortUrl, configBadges, formatDate } from '@/lib/format'

const PAGE_SIZE = 20
const SORTS: SortKey[] = ['createdAt', 'updatedAt', 'expiresAt']

export function LinksView() {
  const t = useTranslations('links')
  const tc = useTranslations('common')
  const locale = useLocale()
  const queryClient = useQueryClient()

  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('createdAt')
  const [page, setPage] = useState(0)
  const [toDelete, setToDelete] = useState<LinkRow | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // undefined → create; a row → edit. Kept while the drawer animates closed.
  const [editing, setEditing] = useState<LinkRow | undefined>(undefined)

  function openCreate() {
    setEditing(undefined)
    setDrawerOpen(true)
  }
  function openEdit(link: LinkRow) {
    setEditing(link)
    setDrawerOpen(true)
  }

  // Debounce the search box.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(input.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(id)
  }, [input])

  const query = useQuery({
    queryKey: ['links', { search, sort, page }],
    queryFn: () =>
      search
        ? linkApi
            .search(search)
            .then((r) => ({ links: r.links, total: r.links.length }))
        : linkApi.list({ limit: PAGE_SIZE, offset: page * PAGE_SIZE, sort }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => linkApi.remove(id),
    onSuccess: () => {
      toast.success(t('delete.success'))
      setToDelete(null)
      void queryClient.invalidateQueries({ queryKey: ['links'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rows = query.data?.links ?? []
  const total = query.data?.total ?? 0
  const pageCount = search ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function copy(shortUrl: string) {
    try {
      await navigator.clipboard.writeText(shortUrl)
      toast.success(tc('copied'))
    } catch {
      toast.error(tc('copyFailed'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          {t('new')}
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-8"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`sort.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border">
          <Spinner className="size-5" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border text-sm text-muted-foreground">
          {t('empty')}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((link) => {
            const shortUrl = buildShortUrl(link.slug, link.domain)
            const badges = configBadges(link.config)
            return (
              <Card key={link.id} size="sm" className="ring-1">
                <CardHeader>
                  <CardTitle className="truncate">{link.slug}</CardTitle>
                  <CardDescription className="truncate">
                    {link.url}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {badges.map((b) => (
                        <Badge
                          key={b}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {b}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDate(link.createdAt, locale)}
                  </p>
                </CardContent>
                <CardFooter className="justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={tc('copy')}
                    onClick={() => copy(shortUrl)}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <QrPopover url={shortUrl} slug={link.slug}>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('qr.title')}
                    >
                      <QrCode className="size-4" />
                    </Button>
                  </QrPopover>
                  <a href={shortUrl} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="icon" aria-label={tc('open')}>
                      <ExternalLink className="size-4" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={tc('edit')}
                    onClick={() => openEdit(link)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={tc('delete')}
                    onClick={() => setToDelete(link)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {!search && pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t('pageOf', { page: page + 1, total: pageCount })}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              {tc('prev')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc('next')}
            </Button>
          </div>
        </div>
      )}

      <LinkDrawer
        open={drawerOpen}
        existing={editing}
        onOpenChange={setDrawerOpen}
      />

      <DeleteDialog
        slug={toDelete?.slug ?? ''}
        open={!!toDelete}
        pending={remove.isPending}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  )
}
