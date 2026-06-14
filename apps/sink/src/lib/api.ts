import type { LinkConfig } from '@/database/schema'
import type { CreateLinkInput, EditLinkInput } from '@/schemas/link'
import { useAuthStore } from '@/stores/auth-store'

// Client-facing link shape — dates are JSON strings over the wire.
export interface LinkRow {
  id: string
  slug: string
  domain: string
  url: string
  comment: string
  config: LinkConfig
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  isDeleted: number
}

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Verify a site token against GET /api/verify.
export async function verifyToken(token: string): Promise<boolean> {
  const res = await fetch('/api/verify', {
    headers: { authorization: `Bearer ${token}` },
  })
  return res.ok
}

function authHeader(): Record<string, string> {
  const token = useAuthStore.getState().token
  return token ? { authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...authHeader(),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(body.error || res.statusText, res.status)
  }
  return res.json() as Promise<T>
}

export type SortKey = 'createdAt' | 'updatedAt' | 'expiresAt'

export const linkApi = {
  list: (params: { limit: number; offset: number; sort: SortKey }) =>
    request<{ links: LinkRow[]; total: number }>(
      `/api/link/list?limit=${params.limit}&offset=${params.offset}&sort=${params.sort}`,
    ),
  search: (q: string) =>
    request<{ links: LinkRow[] }>(
      `/api/link/search?q=${encodeURIComponent(q)}`,
    ),
  get: (id: string) =>
    request<{ link: LinkRow }>(`/api/link/query?id=${encodeURIComponent(id)}`),
  create: (input: CreateLinkInput) =>
    request<{ link: LinkRow }>('/api/link/create', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  edit: (input: EditLinkInput) =>
    request<{ link: LinkRow }>('/api/link/edit', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    request<{ ok: true }>('/api/link/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
  aiSlug: (url: string) =>
    request<{ slug: string; method: string }>(
      `/api/link/ai?url=${encodeURIComponent(url)}`,
    ),
}
