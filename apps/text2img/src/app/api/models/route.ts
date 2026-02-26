import { NextResponse } from 'next/server'
import { AVAILABLE_MODELS } from '@/lib/data'

export async function GET() {
  return NextResponse.json(AVAILABLE_MODELS)
}
