import { Skeleton } from '@cdlab996/ui/components/skeleton'
import Image from 'next/image'

export function SCAssetLoading() {
  return (
    <>
      <div className="relative rounded-sm shrink-0 aspect-square overflow-hidden border border-border/60">
        <Image
          src="/images/media-generating.png"
          alt="loading"
          fill
          className="object-cover"
        />
      </div>

      <div className="space-y-2 mt-3">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-1/3" />
      </div>
    </>
  )
}
