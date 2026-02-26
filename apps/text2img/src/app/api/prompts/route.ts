import { NextResponse } from 'next/server'
import { RANDOM_PROMPTS } from '@/lib/data'

export async function GET() {
  return NextResponse.json(RANDOM_PROMPTS)
}
