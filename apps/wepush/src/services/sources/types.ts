export type SourceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export interface SourceContext {
  apiTimeout: number
  maxRetries: number
  retryDelay: number
}
