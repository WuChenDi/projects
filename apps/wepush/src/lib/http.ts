export class HttpError extends Error {
  readonly status?: number
  readonly url: string
  readonly body?: unknown

  constructor(
    message: string,
    opts: { url: string; status?: number; body?: unknown },
  ) {
    super(message)
    this.name = 'HttpError'
    this.url = opts.url
    this.status = opts.status
    this.body = opts.body
  }
}

export interface FetchJsonOptions {
  timeout: number
  init?: RequestInit
}

export async function fetchJson<T = unknown>(
  url: string,
  { timeout, init }: FetchJsonOptions,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) {
      let body: unknown
      try {
        body = await response.json()
      } catch {
        body = await response.text().catch(() => undefined)
      }
      throw new HttpError(`HTTP ${response.status} ${response.statusText}`, {
        url,
        status: response.status,
        body,
      })
    }
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof HttpError) throw error
    const msg = error instanceof Error ? error.message : String(error)
    throw new HttpError(`HTTP 请求失败: ${msg}`, { url })
  } finally {
    clearTimeout(timer)
  }
}
