import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/platform/auth'

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  // Per-owner isolation collapses the creator dimension to just the caller —
  // each user only ever sees their own links, so this never enumerates other
  // owners' emails.
  return NextResponse.json({ creators: [auth.user.email] })
}
