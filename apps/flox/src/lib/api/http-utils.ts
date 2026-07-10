/**
 * HTTP Utilities for API calls
 * Handles timeouts and retries with a single unified function.
 */

const REQUEST_TIMEOUT = 15000
const MAX_RETRIES = 3
const RETRY_DELAY = 200

/**
 * Fetch with timeout and automatic retry on failure.
 * Throws on network errors; non-OK responses are also treated as errors.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = MAX_RETRIES,
  timeout: number = REQUEST_TIMEOUT,
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      if (attempt > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * attempt),
        )
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)
      lastError = error as Error
    }
  }

  throw lastError
}
