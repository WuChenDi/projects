'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@cdlab996/ui/components/alert-dialog'
import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import { Calendar } from '@cdlab996/ui/components/calendar'
import { Card } from '@cdlab996/ui/components/card'
import { Checkbox } from '@cdlab996/ui/components/checkbox'
import { CopyButton } from '@cdlab996/ui/components/copy-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@cdlab996/ui/components/dropdown-menu'
import { Input } from '@cdlab996/ui/components/input'
import { Label } from '@cdlab996/ui/components/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@cdlab996/ui/components/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cdlab996/ui/components/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@cdlab996/ui/components/sheet'
import { Skeleton } from '@cdlab996/ui/components/skeleton'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@cdlab996/ui/components/toggle-group'
import { IKEmpty } from '@cdlab996/ui/IK/IKEmpty'
import { cn } from '@cdlab996/ui/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endOfDay, startOfDay } from 'date-fns'
import {
  BarChart3,
  CalendarDays,
  Calendar as CalendarIcon,
  CornerDownRight,
  ExternalLink,
  Globe,
  Inbox,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  QrCode,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DeleteDialog } from '@/components/dashboard/links/delete-dialog'
import { LinkDrawer } from '@/components/dashboard/links/link-drawer'
import { QrPopover } from '@/components/dashboard/links/qr-popover'
import { TagInlineEditor } from '@/components/dashboard/links/tag-inline-editor'
import type { LinkRow, SortKey } from '@/lib/api'
import { linkApi, statsApi } from '@/lib/api'
import { buildShortUrl, configBadges, formatDate } from '@/lib/format'
import {
  hasActiveFilters,
  useLinksFilterStore,
} from '@/stores/links-filter-store'

const PAGE_SIZE = 20
const SORTS: SortKey[] = ['createdAt', 'updatedAt', 'expiresAt']
const STATUSES = ['active', 'disabled', 'expired'] as const

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// Effective status of a link, used to filter the search-result path client-side
// (the list path filters on the server).
function linkStatus(link: LinkRow): 'active' | 'disabled' | 'expired' {
  if (link.config.disabled) return 'disabled'
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now())
    return 'expired'
  return 'active'
}

// Destination favicon for the row avatar. Fetched from DuckDuckGo's icon
// service (more privacy-respecting than Google's) and only from the admin
// dashboard; falls back to a Globe glyph when the host has no icon.
function LinkFavicon({ url }: { url: string }) {
  const host = hostOf(url)
  const [failed, setFailed] = useState(false)
  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
      {host && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        // biome-ignore lint/performance/noImgElement: tiny external favicon, next/image not worthwhile
        <img
          src={`https://icons.duckduckgo.com/ip3/${host}.ico`}
          alt=""
          className="size-6"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <Globe className="size-5 text-muted-foreground" />
      )}
    </div>
  )
}

export function LinksView() {
  const t = useTranslations('links')
  const tc = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const queryClient = useQueryClient()

  const filter = useLinksFilterStore()
  const {
    search,
    sort,
    status,
    creator,
    startAt,
    endAt,
    tags,
    tagMatch,
    untagged,
    view,
    setSearch,
    setSort,
    setStatus,
    setCreator,
    setDateRange,
    toggleTag,
    setTagMatch,
    setView,
    resetFilters,
  } = filter

  const [input, setInput] = useState(search)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkTagDraft, setBulkTagDraft] = useState('')
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

  // Debounce the search box into the store.
  useEffect(() => {
    const id = setTimeout(() => setSearch(input.trim()), 300)
    return () => clearTimeout(id)
  }, [input, setSearch])

  // Any filter change resets pagination — the deps are intentional triggers
  // even though the body only calls the stable setPage.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional triggers
  useEffect(() => {
    setPage(0)
  }, [search, sort, status, creator, startAt, endAt, tags, tagMatch, untagged])

  const isSearching = search.length > 0

  const query = useQuery({
    queryKey: [
      'links',
      {
        search,
        sort,
        page,
        status,
        creator,
        startAt,
        endAt,
        tags,
        tagMatch,
        untagged,
      },
    ],
    queryFn: () =>
      isSearching
        ? linkApi
            .search(search)
            .then((r) => ({ links: r.links, total: r.links.length }))
        : linkApi.list({
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
            sort,
            status,
            createdBy: creator,
            startAt,
            endAt,
            tags,
            tagMatch,
            untagged,
          }),
  })

  const creatorsQuery = useQuery({
    queryKey: ['link-creators'],
    queryFn: () => linkApi.creators(),
  })

  const tagsQuery = useQuery({
    queryKey: ['link-tags'],
    queryFn: () => linkApi.tags(),
  })

  // Click counts for every slug in the last 30 days, fetched in one batched
  // metrics call (grouped by slug) rather than one request per visible link.
  const clicksWindow = useMemo(() => {
    const end = Date.now()
    return { startAt: end - 30 * 24 * 60 * 60 * 1000, endAt: end }
  }, [])
  const clicksQuery = useQuery({
    queryKey: ['link-clicks'],
    queryFn: () =>
      statsApi.metrics('slug', { ...clicksWindow, filters: {} }, 50),
  })
  const clicks = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of clicksQuery.data?.metrics ?? []) map.set(m.name, m.count)
    return map
  }, [clicksQuery.data])

  const remove = useMutation({
    mutationFn: (id: string) => linkApi.remove(id),
    onSuccess: () => {
      toast.success(t('delete.success'))
      setToDelete(null)
      void queryClient.invalidateQueries({ queryKey: ['links'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleDisabled = useMutation({
    mutationFn: (link: LinkRow) =>
      linkApi.edit({
        id: link.id,
        config: { ...link.config, disabled: !link.config.disabled },
      }),
    onSuccess: () => {
      toast.success(t('form.updated'))
      void queryClient.invalidateQueries({ queryKey: ['links'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rows = query.data?.links ?? []
  const total = query.data?.total ?? 0
  const pageCount = isSearching ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE))

  // The list path filters status/creator/date/tags on the server. The search
  // path returns a single unfiltered page, so apply those filters client-side.
  const visibleRows = isSearching
    ? rows.filter((l) => {
        const rowTags = l.tags ?? []
        if (untagged) {
          if (rowTags.length > 0) return false
        } else if (tags.length > 0) {
          const ok =
            tagMatch === 'or'
              ? tags.some((tg) => rowTags.includes(tg))
              : tags.every((tg) => rowTags.includes(tg))
          if (!ok) return false
        }
        if (status !== 'all' && linkStatus(l) !== status) return false
        if (creator && l.createdBy !== creator) return false
        const created = new Date(l.createdAt).getTime()
        if (startAt && created < startAt) return false
        if (endAt && created > endAt) return false
        return true
      })
    : rows

  const allTags = tagsQuery.data?.tags ?? []
  const creators = creatorsQuery.data?.creators ?? []

  // Clear the selection whenever the underlying rows change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on data swap
  useEffect(() => {
    setSelected(new Set())
  }, [query.data])

  const selectedRows = visibleRows.filter((l) => selected.has(l.id))
  const allSelected =
    visibleRows.length > 0 && selectedRows.length === visibleRows.length

  function toggleOne(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }
  function toggleAll(on: boolean) {
    setSelected(on ? new Set(visibleRows.map((l) => l.id)) : new Set())
  }

  const bulkToggle = useMutation({
    mutationFn: async (disabled: boolean) => {
      await Promise.all(
        selectedRows.map((l) =>
          linkApi.edit({ id: l.id, config: { ...l.config, disabled } }),
        ),
      )
    },
    onSuccess: () => {
      toast.success(t('bulkUpdated', { count: selectedRows.length }))
      setSelected(new Set())
      void queryClient.invalidateQueries({ queryKey: ['links'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const bulkRemove = useMutation({
    mutationFn: async () => {
      await Promise.all([...selected].map((id) => linkApi.remove(id)))
    },
    onSuccess: () => {
      toast.success(t('bulkDeleted', { count: selected.size }))
      setSelected(new Set())
      setBulkConfirm(false)
      void queryClient.invalidateQueries({ queryKey: ['links'] })
      void queryClient.invalidateQueries({ queryKey: ['link-tags'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const bulkTag = useMutation({
    mutationFn: (op: 'add' | 'remove') =>
      linkApi.tagBulk([...selected], bulkTagDraft.trim(), op),
    onSuccess: (r) => {
      toast.success(t('bulkTagged', { count: r.updated }))
      setBulkTagDraft('')
      setSelected(new Set())
      void queryClient.invalidateQueries({ queryKey: ['links'] })
      void queryClient.invalidateQueries({ queryKey: ['link-tags'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Per-row tag editing from the inline list editor — the staged tag set is
  // saved in one call when the popover closes.
  const inlineTag = useMutation({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) =>
      linkApi.tagSet(id, tags),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['links'] })
      void queryClient.invalidateQueries({ queryKey: ['link-tags'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const dateLabel =
    startAt && endAt
      ? `${formatDate(new Date(startAt).toISOString(), locale)} – ${formatDate(
          new Date(endAt).toISOString(),
          locale,
        )}`
      : t('dateRange')

  // Shared row pieces so the list (horizontal) and grid (vertical) layouts stay
  // in sync without duplicating markup.
  function renderShort(shortUrl: string, shortLabel: string) {
    return (
      <div className="flex items-center gap-1.5">
        <a
          href={shortUrl}
          target="_blank"
          rel="noreferrer"
          className="truncate text-sm font-medium text-primary hover:underline"
        >
          {shortLabel}
        </a>
        <CopyButton
          value={shortUrl}
          size="icon-xs"
          aria-label={tc('copy')}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        />
      </div>
    )
  }

  function renderDest(url: string) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <CornerDownRight className="size-3.5 shrink-0" />
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="truncate hover:underline"
        >
          {url}
        </a>
      </div>
    )
  }

  function renderMeta(link: LinkRow, count: number) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() =>
            router.push(
              `/dashboard/analytics?slug=${encodeURIComponent(link.slug)}`,
            )
          }
          className="flex items-center gap-1 transition-colors hover:text-foreground"
        >
          <BarChart3 className="size-3.5" />
          {t('clicksCount', { count })}
        </button>
        <span className="flex items-center gap-1">
          <CalendarIcon className="size-3.5" />
          {formatDate(link.createdAt, locale)}
        </span>
        {link.createdBy && (
          <button
            type="button"
            onClick={() => setCreator(link.createdBy)}
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <User className="size-3.5" />
            <span className="max-w-[12rem] truncate">{link.createdBy}</span>
          </button>
        )}
        <span className="group/tag flex items-center gap-1.5">
          <Tag className="size-3.5 shrink-0" />
          {link.tags.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {link.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? 'default' : 'secondary'}
                  className="cursor-pointer px-1.5 py-0 text-[10px] font-normal"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </span>
          ) : (
            <span className="text-muted-foreground/70">{t('noTags')}</span>
          )}
          <TagInlineEditor
            selected={link.tags}
            options={allTags.map((x) => x.tag)}
            disabled={inlineTag.isPending}
            onSave={(nextTags) =>
              inlineTag.mutate({ id: link.id, tags: nextTags })
            }
          />
        </span>
        {configBadges(link.config).map((b) => (
          <Badge
            key={b}
            variant="outline"
            className="px-1.5 py-0 text-[10px] font-normal"
          >
            {b}
          </Badge>
        ))}
      </div>
    )
  }

  function renderActions(link: LinkRow, shortUrl: string, disabled: boolean) {
    return (
      <div className="flex shrink-0 items-center gap-0.5">
        <QrPopover url={shortUrl} slug={link.slug}>
          <Button variant="ghost" size="icon" aria-label={t('qr.title')}>
            <QrCode className="size-4" />
          </Button>
        </QrPopover>
        <Button
          variant="ghost"
          size="icon"
          aria-label={tc('edit')}
          onClick={() => openEdit(link)}
        >
          <Pencil className="size-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('table.actions')}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-36" align="end">
            <DropdownMenuItem asChild>
              <a href={shortUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                {tc('open')}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                router.push(
                  `/dashboard/analytics?slug=${encodeURIComponent(link.slug)}`,
                )
              }
            >
              <BarChart3 className="size-4" />
              {t('viewAnalytics')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={toggleDisabled.isPending}
              onClick={() => toggleDisabled.mutate(link)}
            >
              {disabled ? (
                <Power className="size-4" />
              ) : (
                <PowerOff className="size-4" />
              )}
              {disabled ? t('enable') : t('disable')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setToDelete(link)}
            >
              <Trash2 className="size-4" />
              {tc('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  function titleBlock(title: string, disabled: boolean) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="truncate font-semibold leading-tight">{title}</h3>
        {disabled && (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {t('disabled')}
          </Badge>
        )}
      </div>
    )
  }

  // Filter controls — rendered both inline (desktop) and inside the mobile
  // filter drawer. `mobile` stretches them full-width; the inline copies hide
  // below `md` so the drawer owns the small-screen layout.
  function statusSelect(mobile: boolean) {
    return (
      <Select
        value={status}
        onValueChange={(v) => setStatus(v as typeof status)}
      >
        <SelectTrigger
          className={mobile ? 'w-full' : 'hidden w-auto min-w-28 md:flex'}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allStatus')}</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {t(`status.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  function creatorSelect(mobile: boolean) {
    return (
      <Select
        value={creator || 'all'}
        onValueChange={(v) => setCreator(v === 'all' ? '' : v)}
      >
        <SelectTrigger
          className={
            mobile ? 'w-full' : 'hidden w-auto min-w-32 max-w-52 md:flex'
          }
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allCreators')}</SelectItem>
          {creators.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  function dateRangePicker(mobile: boolean) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              mobile ? 'w-full justify-start' : 'hidden md:flex',
              !(startAt && endAt) && 'text-muted-foreground',
            )}
          >
            <CalendarDays className="size-4" />
            {dateLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={2}
            defaultMonth={startAt ? new Date(startAt) : undefined}
            selected={{
              from: startAt ? new Date(startAt) : undefined,
              to: endAt ? new Date(endAt) : undefined,
            }}
            onSelect={(range) =>
              setDateRange(
                range?.from ? startOfDay(range.from).getTime() : null,
                range?.to ? endOfDay(range.to).getTime() : null,
              )
            }
          />
          {(startAt || endAt) && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center"
                onClick={() => setDateRange(null, null)}
              >
                <X className="size-4" />
                {t('clearDate')}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    )
  }

  function sortSelect(mobile: boolean) {
    return (
      <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
        <SelectTrigger
          className={mobile ? 'w-full' : 'hidden w-auto min-w-32 md:flex'}
        >
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
    )
  }

  // Active filters surfaced in the mobile drawer (drives the trigger badge).
  const drawerActiveCount =
    (status !== 'all' ? 1 : 0) +
    (creator !== '' ? 1 : 0) +
    (startAt || endAt ? 1 : 0) +
    (tags.length > 0 || untagged ? 1 : 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 flex-row items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          {t('new')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Search stays on the far left at every breakpoint. */}
        <div className="relative min-w-0 flex-1 md:min-w-[14rem]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9 pr-9"
          />
          {input && (
            <button
              type="button"
              aria-label={t('clearSearch')}
              onClick={() => setInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Mobile: collapse the filter controls into a right-side drawer. */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label={t('filters')}
              className="relative shrink-0 md:hidden"
            >
              <SlidersHorizontal className="size-4" />
              {drawerActiveCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {drawerActiveCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>{t('filters')}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 px-4">
              <div className="space-y-2">
                <Label>{t('statusLabel')}</Label>
                {statusSelect(true)}
              </div>
              <div className="space-y-2">
                <Label>{t('creatorLabel')}</Label>
                {creatorSelect(true)}
              </div>
              <div className="space-y-2">
                <Label>{t('dateRange')}</Label>
                {dateRangePicker(true)}
              </div>
              <div className="space-y-2">
                <Label>{t('sortLabel')}</Label>
                {sortSelect(true)}
              </div>
              {hasActiveFilters(filter) && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setInput('')
                    resetFilters()
                  }}
                >
                  <X className="size-4" />
                  {t('clearFilters')}
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop: filter controls inline (hidden on mobile). */}
        {sortSelect(false)}
        {statusSelect(false)}
        {creatorSelect(false)}
        {dateRangePicker(false)}

        {hasActiveFilters(filter) && (
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:flex"
            onClick={() => {
              setInput('')
              resetFilters()
            }}
          >
            <X className="size-4" />
            {t('clearFilters')}
          </Button>
        )}

        {/* View toggle stays visible at every breakpoint. */}
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as 'list' | 'grid')}
          variant="outline"
          className="shrink-0"
        >
          <ToggleGroupItem value="list" aria-label={t('viewList')}>
            <List className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label={t('viewGrid')}>
            <LayoutGrid className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-sm text-muted-foreground">
            {t('filterByTag')}
          </span>
          {allTags.map(({ tag, count }) => (
            <Badge
              key={tag}
              variant={tags.includes(tag) ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => toggleTag(tag)}
            >
              {tag}
              <span className="ml-1 opacity-60">{count}</span>
            </Badge>
          ))}
          {tags.length > 1 && (
            <ToggleGroup
              type="single"
              value={tagMatch}
              onValueChange={(v) => v && setTagMatch(v as 'and' | 'or')}
              variant="outline"
              size="sm"
              className="ml-1"
            >
              <ToggleGroupItem value="and">{t('tagMatchAnd')}</ToggleGroupItem>
              <ToggleGroupItem value="or">{t('tagMatchOr')}</ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(v) => toggleAll(v === true)}
            aria-label={t('selectAll')}
          />
          <span className="font-medium">
            {t('selectedCount', { count: selected.size })}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={bulkToggle.isPending}
              onClick={() => bulkToggle.mutate(false)}
            >
              <Power className="size-4" />
              {t('enable')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkToggle.isPending}
              onClick={() => bulkToggle.mutate(true)}
            >
              <PowerOff className="size-4" />
              {t('disable')}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Tag className="size-4" />
                  {t('tagAction')}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-2">
                <Label>{t('bulkTagLabel')}</Label>
                <Input
                  value={bulkTagDraft}
                  onChange={(e) => setBulkTagDraft(e.target.value)}
                  placeholder={t('form.addTag')}
                  maxLength={32}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={!bulkTagDraft.trim() || bulkTag.isPending}
                    onClick={() => bulkTag.mutate('add')}
                  >
                    {t('bulkTagAdd')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={!bulkTagDraft.trim() || bulkTag.isPending}
                    onClick={() => bulkTag.mutate('remove')}
                  >
                    {t('bulkTagRemove')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="destructive"
              size="sm"
              className="text-destructive"
              onClick={() => setBulkConfirm(true)}
            >
              <Trash2 className="size-4" />
              {tc('delete')}
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={tc('cancel')}
              onClick={() => setSelected(new Set())}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {query.isLoading ? (
        <div
          className={
            view === 'grid'
              ? 'grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3'
              : 'space-y-2.5'
          }
        >
          {['a', 'b', 'c', 'd', 'e', 'f'].map((k) => (
            <Skeleton key={k} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : visibleRows.length === 0 ? (
        <IKEmpty className="h-40" title={t('empty')} icon={Inbox}>
          <Button onClick={openCreate}>
            <Plus />
            {t('new')}
          </Button>
        </IKEmpty>
      ) : (
        <div
          className={
            view === 'grid'
              ? 'grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3'
              : 'space-y-2.5'
          }
        >
          {visibleRows.map((link) => {
            const shortUrl = buildShortUrl(link.slug, link.domain)
            const shortLabel = shortUrl.replace(/^https?:\/\//, '')
            const disabled = Boolean(link.config.disabled)
            const title =
              link.config.title?.trim() || hostOf(link.url) || link.slug
            const count = clicks.get(link.slug) ?? 0
            const isSelected = selected.has(link.id)
            const checkbox = (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(v) => toggleOne(link.id, v === true)}
                aria-label={link.slug}
              />
            )
            if (view === 'grid') {
              return (
                <Card
                  key={link.id}
                  className={cn(
                    'flex flex-col gap-2 border p-4 transition-all hover:border-primary/60 hover:shadow-xl',
                    disabled && 'opacity-60',
                    isSelected && 'border-primary/60 ring-1 ring-primary/30',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {checkbox}
                      <LinkFavicon url={link.url} />
                    </div>
                    {renderActions(link, shortUrl, disabled)}
                  </div>
                  {titleBlock(title, disabled)}
                  {renderShort(shortUrl, shortLabel)}
                  {renderDest(link.url)}
                  <div className="mt-auto pt-1">{renderMeta(link, count)}</div>
                </Card>
              )
            }

            return (
              <Card
                key={link.id}
                className={cn(
                  'flex flex-row items-start gap-3 border p-4 transition-all hover:border-primary/60 hover:shadow-xl',
                  disabled && 'opacity-60',
                  isSelected && 'border-primary/60 ring-1 ring-primary/30',
                )}
              >
                <div className="pt-1">{checkbox}</div>
                <LinkFavicon url={link.url} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  {/* Header: identity on the left, actions pinned top-right. */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1.5">
                      {titleBlock(title, disabled)}
                      {renderShort(shortUrl, shortLabel)}
                    </div>
                    {renderActions(link, shortUrl, disabled)}
                  </div>
                  {/* Body spans the full width below the header. */}
                  {renderDest(link.url)}
                  {renderMeta(link, count)}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {!isSearching && pageCount > 1 && (
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

      <AlertDialog open={bulkConfirm} onOpenChange={setBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('bulkDeleteTitle', { count: selected.size })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('bulkDeleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkRemove.isPending}
              onClick={(e) => {
                e.preventDefault()
                bulkRemove.mutate()
              }}
            >
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
