import { create } from 'zustand'

interface SidebarStore {
  favoritesOpen: boolean
  historyOpen: boolean
  setFavoritesOpen: (open: boolean) => void
  setHistoryOpen: (open: boolean) => void
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  favoritesOpen: false,
  historyOpen: false,
  setFavoritesOpen: (open) => set({ favoritesOpen: open }),
  setHistoryOpen: (open) => set({ historyOpen: open }),
}))
