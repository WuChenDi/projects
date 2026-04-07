/**
 * Parallel Streaming Search API Route
 * Searches all sources in parallel and streams results immediately as they arrive
 * No waiting - results flow in real-time
 */

import type { NextRequest } from 'next/server'
import { searchVideos } from '@/lib/api/client'
import { getSourceName } from '@/lib/utils/source-names'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json()
        const { query, sources: sourceConfigs, page = 1 } = body

        // Validate input
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                message: 'Invalid query',
              })}\n\n`,
            ),
          )
          controller.close()
          return
        }

        // Use provided sources or fallback to empty (client should provide them)
        const sources =
          Array.isArray(sourceConfigs) && sourceConfigs.length > 0
            ? sourceConfigs
            : []

        if (sources.length === 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                message: 'No valid sources provided',
              })}\n\n`,
            ),
          )
          controller.close()
          return
        }

        // Send initial status
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'start',
              totalSources: sources.length,
            })}\n\n`,
          ),
        )

        // Track progress
        let completedSources = 0
        let totalVideosFound = 0

        // Search all sources in PARALLEL - don't wait for all to finish
        const searchPromises = sources.map(async (source: any) => {
          const startTime = performance.now() // Track start time
          try {
            // Search this source
            const result = await searchVideos(query.trim(), [source], page)
            const endTime = performance.now() // Track end time
            const latency = Math.round(endTime - startTime) // Calculate latency in ms
            const videos = result[0]?.results || []

            completedSources++
            totalVideosFound += videos.length

            // Stream videos immediately as they arrive WITH latency data
            if (videos.length > 0) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'videos',
                    videos: videos.map((video: any) => ({
                      ...video,
                      sourceDisplayName: getSourceName(source.id),
                      latency, // Add latency to each video
                    })),
                    source: source.id,
                    completedSources,
                    totalSources: sources.length,
                    latency, // Also include at source level
                  })}\n\n`,
                ),
              )
            }

            // Send progress update
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'progress',
                  completedSources,
                  totalSources: sources.length,
                  totalVideosFound,
                })}\n\n`,
              ),
            )
          } catch (error) {
            const endTime = performance.now()
            const latency = Math.round(endTime - startTime)
            // Log error but continue with other sources
            console.error(
              `[Search Parallel] Source ${source.id} failed after ${latency}ms:`,
              error,
            )
            completedSources++

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'progress',
                  completedSources,
                  totalSources: sources.length,
                  totalVideosFound,
                })}\n\n`,
              ),
            )
          }
        })

        // Wait for all sources to complete
        await Promise.all(searchPromises)

        // Send completion signal
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'complete',
              totalVideosFound,
              totalSources: sources.length,
            })}\n\n`,
          ),
        )

        controller.close()
      } catch (error) {
        console.error('Search error:', error)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
            })}\n\n`,
          ),
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
