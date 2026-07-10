'use client'

import { Button } from '@cdlab/ui/components/button'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center">
      <span className="text-[9rem] leading-none font-extrabold text-foreground/10 select-none tracking-tighter">
        404
      </span>
      <div className="-mt-10 flex flex-col items-center gap-3">
        <h1 className="text-xl font-medium">页面不存在</h1>
        <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
          你访问的页面可能已被移除、改名，或从未存在。
        </p>
        <div className="mt-8 flex justify-center gap-2">
          <Button onClick={() => router.back()} variant="default" size="lg">
            返回上一页
          </Button>
          <Button onClick={() => router.push('/')} variant="ghost" size="lg">
            回到首页
          </Button>
        </div>
      </div>
    </div>
  )
}
