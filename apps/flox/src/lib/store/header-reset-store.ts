import { create } from 'zustand'

interface HeaderResetStore {
  onReset: (() => void) | null
  setOnReset: (fn: (() => void) | null) => void
}

export const useHeaderResetStore = create<HeaderResetStore>((set) => ({
  onReset: null,
  setOnReset: (fn) => set({ onReset: fn }),
}))
