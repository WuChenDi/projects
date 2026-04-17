import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.trim().length === 0) {
    return NextResponse.json([])
  }

  try {
    const url = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(query)}`

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Referer: 'https://movie.douban.com/',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`Douban API returned ${response.status}`)
    }

    const data = await response.json()

    // Transform image URLs to use proxy
    const results = Array.isArray(data)
      ? data.map((item: any) => ({
          ...item,
          img: item.img
            ? `/api/douban/image?url=${encodeURIComponent(item.img)}`
            : '',
        }))
      : []

    return NextResponse.json(results)
  } catch (error) {
    console.error('Douban suggest API error:', error)
    return NextResponse.json([])
  }
}
