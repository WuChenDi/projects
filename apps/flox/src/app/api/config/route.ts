/**
 * Config API Route
 * Exposes configuration status (never actual values) to the client
 */

import { verifyPasswordFn } from '@cdlab996/utils'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || ''
const PERSIST_PASSWORD = process.env.PERSIST_PASSWORD !== 'false'
const SUBSCRIPTION_SOURCES =
  process.env.SUBSCRIPTION_SOURCES ||
  process.env.NEXT_PUBLIC_SUBSCRIPTION_SOURCES ||
  ''

export async function GET() {
  return NextResponse.json({
    hasEnvPassword: ACCESS_PASSWORD.length > 0,
    persistPassword: PERSIST_PASSWORD,
    subscriptionSources: SUBSCRIPTION_SOURCES,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { hash } = await request.json()

    if (!ACCESS_PASSWORD) {
      return NextResponse.json({ valid: false, message: 'No env password set' })
    }

    const valid = await verifyPasswordFn(hash, ACCESS_PASSWORD)
    return NextResponse.json({ valid })
  } catch {
    return NextResponse.json(
      { valid: false, message: 'Invalid request' },
      { status: 400 },
    )
  }
}
