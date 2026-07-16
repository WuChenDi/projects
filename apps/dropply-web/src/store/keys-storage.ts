import type { StateStorage } from 'zustand/middleware'

// Base64-obfuscated localStorage (UTF-8 safe). NOT encryption — it only keeps
// the persisted key list out of plain sight, matching the reference app.
const encode = (s: string) => btoa(unescape(encodeURIComponent(s)))
const decode = (s: string) => decodeURIComponent(escape(atob(s)))

export const base64StateStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(name)
    if (!raw) return null
    try {
      return decode(raw)
    } catch {
      return raw
    }
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(name, encode(value))
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(name)
  },
}
