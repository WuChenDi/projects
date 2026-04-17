import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sort = searchParams.get('sort') || 'T' // T=热度 R=最新 S=评分
  const tags = searchParams.get('tags') || '' // 综合标签，如 "电影"
  const genres = searchParams.get('genres') || '' // 类型，如 "喜剧"
  const countries = searchParams.get('countries') || '' // 地区，如 "美国"
  const range = searchParams.get('range') || '0,10' // 评分范围
  const start = searchParams.get('start') || '0'
  const limit = searchParams.get('limit') || '20'

  try {
    const params = new URLSearchParams()
    params.set('sort', sort)
    params.set('range', range)
    params.set('start', start)

    // tags 参数：new_search_subjects 用逗号分隔多个标签
    const tagParts: string[] = []
    if (tags) tagParts.push(tags)
    if (genres) tagParts.push(genres)
    if (countries) tagParts.push(countries)
    params.set('tags', tagParts.join(','))

    const url = `https://movie.douban.com/j/new_search_subjects?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Referer: 'https://movie.douban.com/',
      },
      next: { revalidate: 1800 }, // Cache for 30 minutes
    })

    if (!response.ok) {
      throw new Error(`Douban API returned ${response.status}`)
    }

    const data = await response.json()

    // Transform image URLs to use proxy
    if (data.data && Array.isArray(data.data)) {
      data.data = data.data.map((item: any) => ({
        ...item,
        cover: item.cover
          ? `/api/douban/image?url=${encodeURIComponent(item.cover)}`
          : item.cover,
      }))
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Douban filter API error:', error)
    return NextResponse.json(
      { data: [], error: 'Failed to fetch filtered results' },
      { status: 500 },
    )
  }
}
