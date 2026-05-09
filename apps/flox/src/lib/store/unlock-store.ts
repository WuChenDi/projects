import { createPersistedStore } from './create-persisted-store'

interface UnlockState {
  isUnlocked: boolean
  envToken: string | null
  /** True once persisted state has been loaded — gate UI on this to avoid flashes. */
  _hasHydrated: boolean
}

interface UnlockActions {
  unlock: () => void
  lock: () => void
  setEnvToken: (token: string) => void
  clearEnvToken: () => void
  setHasHydrated: (state: boolean) => void
}

export const useUnlockStore = createPersistedStore<UnlockState, UnlockActions>({
  key: 'flox:unlock',
  defaultState: () => ({
    isUnlocked: false,
    envToken: null,
    _hasHydrated: false,
  }),
  partialize: (state) => ({
    isUnlocked: state.isUnlocked,
    envToken: state.envToken,
  }),
  onRehydrate: (state) => {
    state?.setHasHydrated(true)
  },
  actions: (set) => ({
    unlock: () => set({ isUnlocked: true }),
    lock: () => set({ isUnlocked: false, envToken: null }),
    setEnvToken: (token) => set({ envToken: token }),
    clearEnvToken: () => set({ envToken: null }),
    setHasHydrated: (state) => set({ _hasHydrated: state }),
  }),
})
