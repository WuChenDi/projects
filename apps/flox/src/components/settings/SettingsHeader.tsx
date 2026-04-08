import { useRouter } from 'next/navigation'

export function SettingsHeader() {
  const router = useRouter()

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-primary hover:underline mb-4 cursor-pointer"
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        返回上一页
      </button>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-background/95 border border-border">
          <svg
            className="w-6 h-6 text-foreground"
            viewBox="0 -960 960 960"
            fill="currentColor"
          >
            <path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">设置</h1>
          <p className="text-muted-foreground">管理应用程序配置</p>
        </div>
      </div>
    </div>
  )
}
