import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UnlockState {
  isUnlocked: boolean
  envToken: string | null
  _hasHydrated: boolean
  unlock: () => void
  lock: () => void
  setEnvToken: (token: string) => void
  clearEnvToken: () => void
  setHasHydrated: (state: boolean) => void
}

export const useUnlockStore = create<UnlockState>()(
  persist(
    (set) => ({
      isUnlocked: false,
      envToken: null,
      _hasHydrated: false,
      unlock() {
        set({ isUnlocked: true })
      },
      lock() {
        set({ isUnlocked: false, envToken: null })
      },
      setEnvToken(token) {
        set({ envToken: token })
      },
      clearEnvToken() {
        set({ envToken: null })
      },
      setHasHydrated(state) {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: 'flox-unlock-state',
      partialize: (state) => ({
        isUnlocked: state.isUnlocked,
        envToken: state.envToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
