import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@cdlab/ui/components/resizable'
import { IKPageContainer } from '@cdlab/ui/IK'
import HistorySection from '@/components/history-section'
import TTSForm from '@/components/tts-form'
import { TimelineEditorLazy } from '@/editor'

export default function Home() {
  return (
    <IKPageContainer
      scrollable={false}
      className="h-[calc(100dvh-80px)] flex-col"
    >
      <ResizablePanelGroup orientation="vertical" className="size-full gap-1">
        {/* Generation area (form + history) — horizontally resizable, each side scrolls internally */}
        <ResizablePanel id="generation" defaultSize="62%" minSize="30%">
          <ResizablePanelGroup
            orientation="horizontal"
            className="size-full gap-1"
          >
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
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="bg-transparent transition-colors hover:bg-primary/40"
        />

        {/* Audio timeline editor (lazy-loaded, client-only) */}
        <ResizablePanel id="timeline" defaultSize="38%" minSize="20%">
          <TimelineEditorLazy />
        </ResizablePanel>
      </ResizablePanelGroup>
    </IKPageContainer>
  )
}
