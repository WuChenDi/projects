'use client'

import dynamic from 'next/dynamic'

const LaunchpadsView = dynamic(
  () =>
    import('@/components/dashboard/launchpads/launchpads-view').then(
      (m) => m.LaunchpadsView,
    ),
  { ssr: false },
)

export default function LaunchpadsPage() {
  return <LaunchpadsView />
}
