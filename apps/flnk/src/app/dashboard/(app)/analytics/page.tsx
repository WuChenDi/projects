import { Suspense } from 'react'
import { AnalyticsView } from '@/components/dashboard/analytics/analytics-view'

export default function AnalyticsPage() {
  // AnalyticsView reads `?slug=` via useSearchParams, which requires a Suspense
  // boundary during static rendering.
  return (
    <Suspense>
      <AnalyticsView />
    </Suspense>
  )
}
