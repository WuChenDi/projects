'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import { Input } from '@cdlab996/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cdlab996/ui/components/select'
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
import {
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  QrCode,
  Search,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DeleteDialog } from '@/components/dashboard/links/delete-dialog'
import { QrDialog } from '@/components/dashboard/links/qr-dialog'
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
  const [qrLink, setQrLink] = useState<LinkRow | null>(null)
  const [toDelete, setToDelete] = useState<LinkRow | null>(null)

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
        <Link href="/dashboard/link">
          <Button>
            <Plus className="mr-1 size-4" />
            {t('new')}
          </Button>
        </Link>
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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.slug')}</TableHead>
              <TableHead>{t('table.destination')}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t('table.created')}
              </TableHead>
              <TableHead className="text-right">{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Spinner className="mx-auto size-5" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((link) => {
                const shortUrl = buildShortUrl(link.slug, link.domain)
                return (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {link.slug}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {configBadges(link.config).map((b) => (
                          <Badge
                            key={b}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {b}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {link.url}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {formatDate(link.createdAt, locale)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={tc('copy')}
                          onClick={() => copy(shortUrl)}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('qr.title')}
                          onClick={() => setQrLink(link)}
                        >
                          <QrCode className="size-4" />
                        </Button>
                        <a href={shortUrl} target="_blank" rel="noreferrer">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={tc('open')}
                          >
                            <ExternalLink className="size-4" />
                          </Button>
                        </a>
                        <Link href={`/dashboard/link?id=${link.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={tc('edit')}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={tc('delete')}
                          onClick={() => setToDelete(link)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

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

      {qrLink && (
        <QrDialog
          url={buildShortUrl(qrLink.slug, qrLink.domain)}
          slug={qrLink.slug}
          open={!!qrLink}
          onOpenChange={(o) => !o && setQrLink(null)}
        />
      )}
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
