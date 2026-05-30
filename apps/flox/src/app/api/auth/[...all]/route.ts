import { getAuth } from '@/lib/auth'

export const runtime = 'edge'

export async function GET(req: Request) {
  const auth = await getAuth()
  return auth.handler(req)
}

export async function POST(req: Request) {
  const auth = await getAuth()
  return auth.handler(req)
}
