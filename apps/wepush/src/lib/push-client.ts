export interface DryRunUserResult {
  userId: string
  userName: string | null
  templateCode: string
  title: string
  desc: string
  sourceErrors: Record<string, string>
  error?: string
}

export interface DryRunResponse {
  results: DryRunUserResult[]
}

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
    const data = await res
      .json<{ error?: string }>()
      .catch<{ error?: string }>(() => ({}))
    throw new Error(data?.error || `请求失败 (${res.status})`)
  }
  return res.json<RunPushApiResult>()
}

export async function dryRunFromUi(options: RunPushOptions): Promise<DryRunResponse> {
  const res = await fetch('/api/push/dry-run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIds: options.userIds }),
  })
  if (!res.ok) {
    const data = await res
      .json<{ error?: string }>()
      .catch<{ error?: string }>(() => ({}))
    throw new Error(data?.error || `请求失败 (${res.status})`)
  }
  return res.json<DryRunResponse>()
}

export async function retryLogFromUi(logId: string): Promise<RunPushApiResult> {
  const res = await fetch('/api/push/retry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logId }),
  })
  if (!res.ok) {
    const data = await res
      .json<{ error?: string }>()
      .catch<{ error?: string }>(() => ({}))
    throw new Error(data?.error || `请求失败 (${res.status})`)
  }
  return res.json<RunPushApiResult>()
}

export async function retryBatchFromUi(batchId: string): Promise<RunPushApiResult> {
  const res = await fetch(`/api/batches/${batchId}/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) {
    const data = await res
      .json<{ error?: string }>()
      .catch<{ error?: string }>(() => ({}))
    throw new Error(data?.error || `请求失败 (${res.status})`)
  }
  return res.json<RunPushApiResult>()
}
