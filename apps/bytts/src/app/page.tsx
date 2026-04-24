import { IKPageContainer } from '@cdlab996/ui/IK'
import HistorySection from '@/components/history-section'
import TTSForm from '@/components/tts-form'

export default function Home() {
  return (
    <IKPageContainer scrollable={false}>
      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        <div className="space-y-4">
          <TTSForm />
        </div>

        <HistorySection />
      </div>
    </IKPageContainer>
  )
}
