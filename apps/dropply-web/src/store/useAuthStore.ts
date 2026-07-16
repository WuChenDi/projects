import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AuthStore {
  totpToken: string | null
  setTotpToken: (token: string) => void
  clearTotpToken: () => void
  sharePassword: string | null
  setSharePassword: (pw: string) => void
  clearSharePassword: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      totpToken: null,

      setTotpToken: (token) => set({ totpToken: token }),

      clearTotpToken: () => set({ totpToken: null }),

      sharePassword: null,

      setSharePassword: (pw) => set({ sharePassword: pw }),

      clearSharePassword: () => set({ sharePassword: null }),
    }),
    {
      name: 'dropply-auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
