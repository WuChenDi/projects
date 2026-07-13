import { NextResponse } from 'next/server'
import { importLinks } from '@/lib/links'
import { withAuth } from '@/lib/with-auth'
import { ImportDataSchema } from '@/schemas/link'

export const POST = withAuth(
  ImportDataSchema,
  async (data, { user, env }) => {
    const report = await importLinks(env, data.links, user.email)
    return NextResponse.json(report)
  },
  'Invalid import data',
)
