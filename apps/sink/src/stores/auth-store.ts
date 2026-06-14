import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  _hasHydrated: boolean
}

interface AuthActions {
  setToken: (token: string) => void
  signOut: () => void
  setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      token: null,
      _hasHydrated: false,
      setToken: (token) => set({ token }),
      signOut: () => set({ token: null }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'sink:auth',
      partialize: (state) => ({ token: state.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
