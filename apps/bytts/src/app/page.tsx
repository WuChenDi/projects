import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@cdlab/ui/components/resizable'
import { IKPageContainer } from '@cdlab/ui/IK'
import HistorySection from '@/components/history-section'
import TTSForm from '@/components/tts-form'

export default function Home() {
  return (
    <IKPageContainer
      scrollable={false}
      className="h-[calc(100dvh-80px)] flex-col"
    >
      {/* Form + history — horizontally resizable, each side scrolls internally */}
      <ResizablePanelGroup orientation="horizontal" className="size-full gap-1">
        <ResizablePanel id="form" defaultSize="30%" minSize="22%">
          <TTSForm />
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className="bg-transparent transition-colors hover:bg-primary/40"
        />
        <ResizablePanel id="history" defaultSize="70%" minSize="30%">
          <HistorySection />
        </ResizablePanel>
      </ResizablePanelGroup>
    </IKPageContainer>
  )
}
