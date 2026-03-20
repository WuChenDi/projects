'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MigrationDialog } from '@/components/editor/dialogs/migration-dialog'
import { EditorHeader } from '@/components/editor/editor-header'
import { AssetsPanel } from '@/components/editor/panels/assets'
import { PreviewPanel } from '@/components/editor/panels/preview'
import { PropertiesPanel } from '@/components/editor/panels/properties'
import { Timeline } from '@/components/editor/panels/timeline'
import { EditorProvider } from '@/components/providers/editor-provider'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/resizable'
import { useAgentStore } from '@/stores/agent-store'
import { usePanelStore } from '@/stores/panel-store'

export default function Editor() {
  const [projectId, setProjectId] = useState<string | null>(null)
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('projectId')
    if (!id) {
      router.replace(`/${locale}/projects`)
      return
    }
    setProjectId(id)
  }, [router, locale])

  if (!projectId) return null

  return (
    <EditorProvider projectId={projectId}>
      <div className="bg-background flex h-screen w-screen flex-col overflow-hidden">
        <EditorHeader />
        <div className="min-h-0 min-w-0 flex-1 px-3 pb-3">
          <EditorLayout />
        </div>
        <MigrationDialog />
      </div>
    </EditorProvider>
  )
}

function EditorLayout() {
  const { panels, setPanel } = usePanelStore()
  const isAgentOpen = useAgentStore((s) => s.isOpen)

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="size-full gap-[0.19rem]"
      onLayout={(sizes) => {
        if (isAgentOpen && sizes[1] != null) {
          setPanel('agent', sizes[1])
        }
      }}
    >
      <ResizablePanel
        defaultSize={isAgentOpen ? 100 - panels.agent : 100}
        minSize={50}
        className="min-w-0"
      >
        <ResizablePanelGroup
          direction="vertical"
          className="size-full gap-[0.18rem]"
          onLayout={(sizes) => {
            setPanel('mainContent', sizes[0] ?? panels.mainContent)
            setPanel('timeline', sizes[1] ?? panels.timeline)
          }}
        >
          <ResizablePanel
            defaultSize={panels.mainContent}
            minSize={30}
            maxSize={85}
            className="min-h-0"
          >
            <ResizablePanelGroup
              direction="horizontal"
              className="size-full gap-[0.19rem]"
              onLayout={(sizes) => {
                setPanel('tools', sizes[0] ?? panels.tools)
                setPanel('preview', sizes[1] ?? panels.preview)
                setPanel('properties', sizes[2] ?? panels.properties)
              }}
            >
              <ResizablePanel
                defaultSize={panels.tools}
                minSize={15}
                maxSize={40}
                className="min-w-0"
              >
                <AssetsPanel />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                defaultSize={panels.preview}
                minSize={30}
                className="min-h-0 min-w-0 flex-1"
              >
                <PreviewPanel />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                defaultSize={panels.properties}
                minSize={15}
                maxSize={40}
                className="min-w-0"
              >
                <PropertiesPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            defaultSize={panels.timeline}
            minSize={15}
            maxSize={70}
            className="min-h-0"
          >
            <Timeline />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
