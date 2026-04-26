import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ApiFormat = 'openai' | 'edge'

export interface CustomApi {
  id: string
  name: string
  endpoint: string
  apiKey: string
  modelEndpoint: string
  format: ApiFormat
  manual: string[]
  maxLength?: number
  enableSegmentation: boolean
}

interface ApiStore {
  customApis: Record<string, CustomApi>
  addApi: (api: Omit<CustomApi, 'id'>) => string
  updateApi: (id: string, updates: Partial<Omit<CustomApi, 'id'>>) => void
  removeApi: (id: string) => void
}

export const useApiStore = create<ApiStore>()(
  persist(
    (set) => ({
      customApis: {},

      addApi: (api) => {
        const id = `custom-${Date.now()}`
        set((state) => ({
          customApis: { ...state.customApis, [id]: { ...api, id } },
        }))
        return id
      },

      updateApi: (id, updates) => {
        set((state) => ({
          customApis: {
            ...state.customApis,
            [id]: { ...state.customApis[id], ...updates },
          },
        }))
      },

      removeApi: (id) => {
        set((state) => {
          const next = { ...state.customApis }
          delete next[id]
          return { customApis: next }
        })
      },
    }),
    { name: 'bytts-custom-apis' },
  ),
)
