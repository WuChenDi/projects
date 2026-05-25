export interface RunPushApiResult {
  batchId: string
  totalCount: number
  successCount: number
  failedCount: number
  results: Array<{
    userId: string
    status: 'success' | 'failed'
    logId: string
    errorMessage?: string
  }>
}

export interface RunPushOptions {
  userIds?: string[]
  trigger?: 'manual' | 'api' | 'cron'
}

// Same-origin calls from the UI: the server accepts these without Bearer
// (see requireBearerOrSameOrigin). Bearer is only for external API consumers.
export async function runPushFromUi(
  options: RunPushOptions,
): Promise<RunPushApiResult> {
  const res = await fetch('/api/push/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userIds: options.userIds,
      trigger: options.trigger ?? 'manual',
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || `请求失败 (${res.status})`)
  }
  return res.json()
}

export async function retryLogFromUi(logId: string): Promise<RunPushApiResult> {
  const res = await fetch('/api/push/retry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logId }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || `请求失败 (${res.status})`)
  }
  return res.json()
}
