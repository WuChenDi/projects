import { verifyPasswordFn } from '@cdlab996/utils'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

function readAccessPassword(): string {
  return process.env.ACCESS_PASSWORD || ''
}

export function GET() {
  return NextResponse.json({
    hasEnvPassword: readAccessPassword().length > 0,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { hash } = await request.json()
    const pwd = readAccessPassword()

    if (!pwd) {
      return NextResponse.json({ valid: false, message: 'No env password set' })
    }

    const valid = await verifyPasswordFn(hash, pwd)
    return NextResponse.json({ valid })
  } catch {
    return NextResponse.json(
      { valid: false, message: 'Invalid request' },
      { status: 400 },
    )
  }
}
