import { create } from 'zustand'

interface SidebarStore {
  favoritesOpen: boolean
  historyOpen: boolean
  watchLaterOpen: boolean
  setFavoritesOpen: (open: boolean) => void
  setHistoryOpen: (open: boolean) => void
  setWatchLaterOpen: (open: boolean) => void
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  favoritesOpen: false,
  historyOpen: false,
  watchLaterOpen: false,
  setFavoritesOpen: (open) => set({ favoritesOpen: open }),
  setHistoryOpen: (open) => set({ historyOpen: open }),
  setWatchLaterOpen: (open) => set({ watchLaterOpen: open }),
}))
