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

async function fetchPushApiToken(): Promise<string> {
  const res = await fetch('/api/settings')
  if (!res.ok) throw new Error('无法读取全局配置')
  const data = await res.json()
  if (!data?.pushApiToken) {
    throw new Error('未配置 pushApiToken，请打开 /settings 生成')
  }
  return data.pushApiToken as string
}

export async function runPushFromUi(
  options: RunPushOptions,
): Promise<RunPushApiResult> {
  const token = await fetchPushApiToken()
  const res = await fetch('/api/push/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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
  const token = await fetchPushApiToken()
  const res = await fetch('/api/push/retry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ logId }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || `请求失败 (${res.status})`)
  }
  return res.json()
}
