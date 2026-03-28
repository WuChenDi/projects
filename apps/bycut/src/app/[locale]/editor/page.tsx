'use client'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@cdlab996/ui/components/resizable'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MigrationDialog } from '@/components/editor/dialogs/migration-dialog'
import { EditorHeader } from '@/components/editor/editor-header'
import { AssetsPanel } from '@/components/editor/panels/assets'
import { PreviewPanel } from '@/components/editor/panels/preview'
import { PropertiesPanel } from '@/components/editor/panels/properties'
import { Timeline } from '@/components/editor/panels/timeline'
import { EditorProvider } from '@/components/providers/editor-provider'
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
      <div className="flex h-screen w-screen flex-col overflow-hidden">
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
      orientation="horizontal"
      className="size-full gap-[0.19rem]"
      onLayoutChange={(layout) => {
        if (isAgentOpen && layout['agent'] != null) {
          setPanel('agent', layout['agent'])
        }
      }}
    >
      <ResizablePanel
        id="main"
        defaultSize={`${isAgentOpen ? 100 - panels.agent : 100}%`}
        minSize="50%"
        className="min-w-0"
      >
        <ResizablePanelGroup
          orientation="vertical"
          className="size-full gap-[0.18rem]"
          onLayoutChange={(layout) => {
            setPanel('mainContent', layout['mainContent'] ?? panels.mainContent)
            setPanel('timeline', layout['timeline'] ?? panels.timeline)
          }}
        >
          <ResizablePanel
            id="mainContent"
            defaultSize={`${panels.mainContent}%`}
            minSize="30%"
            maxSize="85%"
            className="min-h-0"
          >
            <ResizablePanelGroup
              orientation="horizontal"
              className="size-full gap-[0.19rem]"
              onLayoutChange={(layout) => {
                setPanel('tools', layout['tools'] ?? panels.tools)
                setPanel('preview', layout['preview'] ?? panels.preview)
                setPanel(
                  'properties',
                  layout['properties'] ?? panels.properties,
                )
              }}
            >
              <ResizablePanel
                id="tools"
                defaultSize={`${panels.tools}%`}
                minSize="15%"
                maxSize="40%"
                className="min-w-0"
              >
                <AssetsPanel />
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-transparent" />

              <ResizablePanel
                id="preview"
                defaultSize={`${panels.preview}%`}
                minSize="30%"
                className="min-h-0 min-w-0 flex-1"
              >
                <PreviewPanel />
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-transparent" />

              <ResizablePanel
                id="properties"
                defaultSize={`${panels.properties}%`}
                minSize="15%"
                maxSize="40%"
                className="min-w-0"
              >
                <PropertiesPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-transparent" />

          <ResizablePanel
            id="timeline"
            defaultSize={`${panels.timeline}%`}
            minSize="15%"
            maxSize="70%"
            className="min-h-0"
          >
            <Timeline />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
