import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { DashboardShell } from '@/components/dashboard/shell'
import { getAuth } from '@/lib/auth'

export default async function ProtectedDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const auth = await getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/dashboard/login')

  return <DashboardShell>{children}</DashboardShell>
}
