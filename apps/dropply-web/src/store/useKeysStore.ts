import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { KeyPair, PublicKey } from '@/types/keys'
import { base64StateStorage } from './keys-storage'

interface KeysState {
  keyPairs: KeyPair[]
  publicKeys: PublicKey[]
  /** Argon2id hash "saltHex:hashHex" of the 6-digit UI PIN (null = no PIN). */
  passwordHash: string | null
  addKeyPair: (k: KeyPair) => void
  updateKeyPair: (publicKey: string, updates: Partial<KeyPair>) => void
  removeKeyPair: (publicKey: string) => void
  addPublicKey: (k: PublicKey) => void
  updatePublicKey: (publicKey: string, updates: Partial<PublicKey>) => void
  removePublicKey: (publicKey: string) => void
  setPasswordHash: (hash: string | null) => void
  resetAll: () => void
}

export const useKeysStore = create<KeysState>()(
  persist(
    (set) => ({
      keyPairs: [],
      publicKeys: [],
      passwordHash: null,
      addKeyPair: (k) =>
        set((s) => ({
          keyPairs: s.keyPairs.some((x) => x.publicKey === k.publicKey)
            ? s.keyPairs
            : [...s.keyPairs, k],
        })),
      updateKeyPair: (publicKey, updates) =>
        set((s) => ({
          keyPairs: s.keyPairs.map((x) =>
            x.publicKey === publicKey ? { ...x, ...updates } : x,
          ),
        })),
      removeKeyPair: (publicKey) =>
        set((s) => ({
          keyPairs: s.keyPairs.filter((x) => x.publicKey !== publicKey),
        })),
      addPublicKey: (k) =>
        set((s) => ({
          publicKeys: s.publicKeys.some((x) => x.publicKey === k.publicKey)
            ? s.publicKeys
            : [...s.publicKeys, k],
        })),
      updatePublicKey: (publicKey, updates) =>
        set((s) => ({
          publicKeys: s.publicKeys.map((x) =>
            x.publicKey === publicKey ? { ...x, ...updates } : x,
          ),
        })),
      removePublicKey: (publicKey) =>
        set((s) => ({
          publicKeys: s.publicKeys.filter((x) => x.publicKey !== publicKey),
        })),
      setPasswordHash: (hash) => set({ passwordHash: hash }),
      resetAll: () => set({ keyPairs: [], publicKeys: [], passwordHash: null }),
    }),
    {
      name: 'dropply-keys',
      storage: createJSONStorage(() => base64StateStorage),
    },
  ),
)
