import type { StateCreator, StoreApi, UseBoundStore } from 'zustand'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { registerStore } from './registry'

export interface PersistedStoreConfig<S extends object, A extends object> {
  /** localStorage key — must follow `flox:<scope>[:<sub>]` */
  key: string
  /** Pure factory returning a fresh default state object */
  defaultState: () => S
  /** Actions factory; receives zustand set/get over the merged store type */
  actions: (
    set: StoreApi<S & A>['setState'],
    get: StoreApi<S & A>['getState'],
  ) => A
  /** Optional hook for migrating / validating persisted state on hydration */
  merge?: (persisted: unknown, defaults: S) => S
  /**
   * Optional override for which state fields get written to storage.
   * Defaults to every key returned by `defaultState()`.
   */
  partialize?: (state: S) => Partial<S>
  /** Fires once persist middleware finishes rehydrating from storage. */
  onRehydrate?: (state: (S & A) | undefined) => void
}

/**
 * Create a persisted zustand store and auto-register it for global reset / export / import.
 * Actions are dropped from persistence and reset; only state fields round-trip.
 */
export function createPersistedStore<S extends object, A extends object>(
  config: PersistedStoreConfig<S, A>,
): UseBoundStore<StoreApi<S & A>> {
  type Store = S & A

  const stateKeys = Object.keys(config.defaultState()) as (keyof S)[]

  const pickStateForPersist = (state: Store): Partial<Store> => {
    if (config.partialize) {
      return config.partialize(state as unknown as S) as Partial<Store>
    }
    const out: Record<string, unknown> = {}
    for (const k of stateKeys) out[k as string] = state[k as keyof Store]
    return out as Partial<Store>
  }

  const pickAllState = (state: Store): Partial<Store> => {
    const out: Record<string, unknown> = {}
    for (const k of stateKeys) out[k as string] = state[k as keyof Store]
    return out as Partial<Store>
  }

  const initializer: StateCreator<Store> = (set, get) =>
    ({
      ...config.defaultState(),
      ...config.actions(set, get),
    }) as Store

  const useStore = create<Store>()(
    persist(initializer, {
      name: config.key,
      partialize: (state) => pickStateForPersist(state),
      merge: (persisted, current) => {
        try {
          const merged = config.merge
            ? config.merge(persisted, config.defaultState())
            : ({
                ...config.defaultState(),
                ...((persisted as Partial<S>) ?? {}),
              } as S)
          return { ...current, ...merged }
        } catch {
          return current
        }
      },
      onRehydrateStorage: config.onRehydrate
        ? () => config.onRehydrate
        : undefined,
    }),
  )

  registerStore({
    key: config.key,
    reset() {
      useStore.setState(config.defaultState() as Partial<Store>, false)
    },
    serialize() {
      return pickAllState(useStore.getState())
    },
    hydrate(data) {
      if (data && typeof data === 'object') {
        useStore.setState(data as Partial<Store>, false)
      }
    },
  })

  return useStore
}
