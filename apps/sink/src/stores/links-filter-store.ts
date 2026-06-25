import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LinkStatusFilter, SortKey } from '@/lib/api'

export type LinkView = 'list' | 'grid'

interface LinksFilterState {
  // Search + filter conditions for the links list.
  search: string
  sort: SortKey
  status: LinkStatusFilter
  creator: string // '' = any creator
  startAt: number | null // createdAt range, epoch ms
  endAt: number | null
  tagFilter: string | null
  // Layout preference.
  view: LinkView

  setSearch: (v: string) => void
  setSort: (v: SortKey) => void
  setStatus: (v: LinkStatusFilter) => void
  setCreator: (v: string) => void
  setDateRange: (start: number | null, end: number | null) => void
  setTagFilter: (v: string | null) => void
  setView: (v: LinkView) => void
  // Clear every filter (keeps sort + view).
  resetFilters: () => void
}

const FILTER_DEFAULTS = {
  search: '',
  status: 'all' as LinkStatusFilter,
  creator: '',
  startAt: null,
  endAt: null,
  tagFilter: null,
}

export const useLinksFilterStore = create<LinksFilterState>()(
  persist(
    (set) => ({
      ...FILTER_DEFAULTS,
      sort: 'createdAt',
      view: 'list',

      setSearch: (search) => set({ search }),
      setSort: (sort) => set({ sort }),
      setStatus: (status) => set({ status }),
      setCreator: (creator) => set({ creator }),
      setDateRange: (startAt, endAt) => set({ startAt, endAt }),
      setTagFilter: (tagFilter) => set({ tagFilter }),
      setView: (view) => set({ view }),
      resetFilters: () => set({ ...FILTER_DEFAULTS }),
    }),
    {
      name: 'sink-links-filter',
      // Persist only durable preferences; transient conditions (search text,
      // date range, creator, tag) start fresh each session.
      partialize: (s) => ({ sort: s.sort, status: s.status, view: s.view }),
    },
  ),
)

// True when any non-default filter is active (drives the "clear" affordance).
export function hasActiveFilters(s: LinksFilterState): boolean {
  return (
    s.search !== '' ||
    s.status !== 'all' ||
    s.creator !== '' ||
    s.startAt !== null ||
    s.endAt !== null ||
    s.tagFilter !== null
  )
}
