import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || '11' // Genre type ID (e.g. 11=剧情, 24=喜剧)
  const intervalId = searchParams.get('interval_id') || '100:90'
  const start = searchParams.get('start') || '0'
  const limit = searchParams.get('limit') || '20'

  try {
    const params = new URLSearchParams()
    params.set('type', type)
    params.set('interval_id', intervalId)
    params.set('action', '')
    params.set('start', start)
    params.set('limit', limit)

    const url = `https://movie.douban.com/j/chart/top_list?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Referer: 'https://movie.douban.com/',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`Douban API returned ${response.status}`)
    }

    const data = await response.json()

    // Transform image URLs to use proxy
    const results = Array.isArray(data)
      ? data.map((item: any) => ({
          ...item,
          cover_url: item.cover_url
            ? `/api/douban/image?url=${encodeURIComponent(item.cover_url)}`
            : item.cover_url,
        }))
      : []

    return NextResponse.json(results)
  } catch (error) {
    console.error('Douban ranking API error:', error)
    return NextResponse.json([])
  }
}
