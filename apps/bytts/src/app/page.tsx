import { IKPageContainer } from '@cdlab/ui/IK'
import HistorySection from '@/components/history-section'
import TTSForm from '@/components/tts-form'
import { TimelineEditorLazy } from '@/editor'

export default function Home() {
  return (
    <IKPageContainer>
      <div className="flex w-full flex-col gap-4">
        {/* Generation area (unchanged) */}
        <div className="grid w-full grid-cols-1 gap-4 lg:h-[480px] lg:grid-cols-[420px_1fr]">
          <div className="space-y-4">
            <TTSForm />
          </div>

          <HistorySection />
        </div>

        {/* Audio timeline editor (lazy-loaded, client-only) */}
        <div className="h-[420px] w-full">
          <TimelineEditorLazy />
        </div>
      </div>
    </IKPageContainer>
  )
}
