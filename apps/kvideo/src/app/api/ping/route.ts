/**
 * Ping API Route - Measures latency to video sources
 * Returns response time for real-time latency display
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const startTime = performance.now()

    try {
      // Use HEAD request for faster ping (less data transfer)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

      await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors', // Allow cross-origin requests
      })

      clearTimeout(timeoutId)

      const endTime = performance.now()
      const latency = Math.round(endTime - startTime)

      return NextResponse.json({ latency, success: true })
    } catch (fetchError) {
      // If HEAD fails, try GET with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        const endTime = performance.now()
        const latency = Math.round(endTime - startTime)
        return NextResponse.json({ latency, success: true })
      } catch {
        clearTimeout(timeoutId)
        const endTime = performance.now()
        const latency = Math.round(endTime - startTime)
        // Still return latency even on error (timeout = slow)
        return NextResponse.json({ latency, success: false, timeout: true })
      }
    }
  } catch (error) {
    console.error('Ping error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
