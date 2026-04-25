export function IKAssetLoading() {
  return (
    <div className="relative w-full h-full bg-background">
      <div className="w-full h-full absolute inset-0">
        <img
          src="/images/media-generating.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover select-none"
          draggable={false}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-sm text-card-foreground">loading...</div>
      </div>
    </div>
  )
}
