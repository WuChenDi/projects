'use client'

import { NotFoundState } from '@cdlab/ui/components/not-found-state'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  return (
    <NotFoundState
      title="页面不存在"
      description="你访问的页面可能已被移除、改名，或从未存在。"
      backLabel="返回上一页"
      homeLabel="回到首页"
      onBack={() => router.back()}
      onHome={() => router.push('/')}
    />
  )
}
