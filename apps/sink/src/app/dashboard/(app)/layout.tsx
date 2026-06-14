import type { ReactNode } from 'react'
import { SiteTokenGate } from '@/components/auth/site-token-gate'
import { DashboardShell } from '@/components/dashboard/shell'

export default function ProtectedDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <SiteTokenGate>
      <DashboardShell>{children}</DashboardShell>
    </SiteTokenGate>
  )
}
