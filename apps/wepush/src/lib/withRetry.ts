import { sleep } from './sleep'

export interface RetryOptions {
  maxRetries: number
  retryDelay: number
  context: string
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxRetries, retryDelay, context } = options
  let lastError: unknown
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (i === maxRetries) break
      console.warn(`${context} 失败，第${i + 1}次重试`, {
        error: error instanceof Error ? error.message : String(error),
      })
      await sleep(retryDelay * (i + 1))
    }
  }
  throw lastError
}
