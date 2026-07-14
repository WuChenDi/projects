'use client'

import dynamic from 'next/dynamic'
import { use } from 'react'

const LaunchpadEditor = dynamic(
  () =>
    import('@/components/dashboard/launchpads/launchpad-editor').then(
      (m) => m.LaunchpadEditor,
    ),
  { ssr: false },
)

type PageProps = { params: Promise<{ id: string }> }

export default function LaunchpadEditorPage({ params }: PageProps) {
  const { id } = use(params)
  return <LaunchpadEditor id={id} />
}
