import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AuthStore {
  sharePassword: string | null
  setSharePassword: (pw: string) => void
  clearSharePassword: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
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
