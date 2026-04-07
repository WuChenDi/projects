/**
 * HTTP Utilities for API calls
 * Handles timeouts and retries
 */

const REQUEST_TIMEOUT = 15000
const MAX_RETRIES = 3
const RETRY_DELAY = 200

/**
 * Fetch with timeout support
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Retry logic wrapper
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (i < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * (i + 1)),
        )
      }
    }
  }

  throw lastError
}
