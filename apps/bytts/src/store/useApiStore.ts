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

export interface BuiltinOverride {
  endpoint?: string
  apiKey?: string
  maxLength?: number
  splitLength?: number
}

interface ApiStore {
  customApis: Record<string, CustomApi>
  builtinOverrides: Record<string, BuiltinOverride>
  addApi: (api: Omit<CustomApi, 'id'>) => string
  updateApi: (id: string, updates: Partial<Omit<CustomApi, 'id'>>) => void
  removeApi: (id: string) => void
  setBuiltinOverride: (id: string, override: BuiltinOverride) => void
  removeBuiltinOverride: (id: string) => void
}

export const useApiStore = create<ApiStore>()(
  persist(
    (set) => ({
      customApis: {},
      builtinOverrides: {},

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

      setBuiltinOverride: (id, override) => {
        set((state) => ({
          builtinOverrides: { ...state.builtinOverrides, [id]: override },
        }))
      },

      removeBuiltinOverride: (id) => {
        set((state) => {
          const next = { ...state.builtinOverrides }
          delete next[id]
          return { builtinOverrides: next }
        })
      },
    }),
    { name: 'bytts-custom-apis' },
  ),
)
