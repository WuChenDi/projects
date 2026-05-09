/**
 * Tag Orders Store - Per-scope custom ordering / custom-added tags.
 * Each scope (e.g. `douban:movie`, `douban:tv`, `premium`) keeps its own
 * `Tag[]` list, persisted as a single localStorage entry under
 * `flox:tag-orders`.
 */

import type { Tag } from '@/lib/types'
import { createPersistedStore } from './create-persisted-store'

interface TagOrdersState {
  orders: Record<string, Tag[]>
}

interface TagOrdersActions {
  setOrder: (scope: string, tags: Tag[]) => void
  clearOrder: (scope: string) => void
}

export const useTagOrdersStore = createPersistedStore<
  TagOrdersState,
  TagOrdersActions
>({
  key: 'flox:tag-orders',
  defaultState: () => ({ orders: {} }),
  actions: (set) => ({
    setOrder: (scope, tags) =>
      set((state) => ({ orders: { ...state.orders, [scope]: tags } })),
    clearOrder: (scope) =>
      set((state) => {
        if (!(scope in state.orders)) return state
        const next = { ...state.orders }
        delete next[scope]
        return { orders: next }
      }),
  }),
})
