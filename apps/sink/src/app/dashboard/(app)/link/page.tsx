'use client'

import { Spinner } from '@cdlab996/ui/components/spinner'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { LinkEditor } from '@/components/dashboard/link-editor/link-editor'
import { linkApi } from '@/lib/api'

function EditorLoader() {
  const id = useSearchParams().get('id')
  const query = useQuery({
    queryKey: ['link', id],
    queryFn: () => linkApi.get(id!),
    enabled: !!id,
  })

  if (id && query.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    )
  }

  return <LinkEditor existing={query.data?.link} />
}

export default function LinkEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      }
    >
      <EditorLoader />
    </Suspense>
  )
}
