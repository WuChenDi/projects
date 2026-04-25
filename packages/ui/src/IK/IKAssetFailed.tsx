import { OctagonAlert } from 'lucide-react'

export function IKAssetFailed({ error }: { error?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <OctagonAlert className="size-8 text-red-400" />
      {error && (
        <p className="text-sm text-red-400/90 text-center line-clamp-2">
          {error}
        </p>
      )}
    </div>
  )
}
