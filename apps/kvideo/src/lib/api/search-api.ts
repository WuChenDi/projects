import type { ApiSearchResponse, VideoItem, VideoSource } from '@/lib/types'
import { fetchWithRetry } from './http-utils'

/**
 * Search videos from a single source
 */
async function searchVideosBySource(
  query: string,
  source: VideoSource,
  page: number = 1,
): Promise<{ results: VideoItem[]; source: string; responseTime: number }> {
  const startTime = Date.now()

  const url = new URL(`${source.baseUrl}${source.searchPath}`)
  url.searchParams.set('ac', 'detail')
  url.searchParams.set('wd', query)
  url.searchParams.set('pg', page.toString())

  try {
    const response = await fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        ...source.headers,
      },
    })

    const data: ApiSearchResponse = await response.json()

    if (data.code !== 1 && data.code !== 0) {
      throw new Error(data.msg || 'Invalid API response')
    }

    const results: VideoItem[] = (data.list || []).map((item) => ({
      ...item,
      source: source.id,
    }))

    return {
      results,
      source: source.id,
      responseTime: Date.now() - startTime,
    }
  } catch (error) {
    console.error(`Search failed for source ${source.name}:`, error)
    throw {
      code: 'SEARCH_FAILED',
      message: `Failed to search from ${source.name}`,
      source: source.id,
      retryable: true,
    }
  }
}

/**
 * Search videos from multiple sources in parallel
 */
export async function searchVideos(
  query: string,
  sources: VideoSource[],
  page: number = 1,
): Promise<
  Array<{
    results: VideoItem[]
    source: string
    responseTime?: number
    error?: string
  }>
> {
  const searchPromises = sources.map(async (source) => {
    try {
      return await searchVideosBySource(query, source, page)
    } catch (error) {
      return {
        results: [],
        source: source.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  return Promise.all(searchPromises)
}
