'use client'

import { Button } from '@cdlab996/ui/components/button'
import { cn } from '@cdlab996/ui/lib/utils'
import { ArrowLeft, Command, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  LanguageSelector as LanguageToggle,
  ThemeToggle,
} from '@/components/layout'
import { useEditor } from '@/hooks/use-editor'
import { useRouter } from '@/lib/navigation'
import { useAgentStore } from '@/stores/agent-store'
import { ShortcutsDialog } from './dialogs/shortcuts-dialog'
import { ExportButton } from './export-button'

export function EditorHeader() {
  const t = useTranslations()
  const [showShortcuts, setShowShortcuts] = useState(false)

  return (
    <header className="flex h-[3.4rem] items-center justify-between px-3 pt-0.5">
      <div className="flex items-center gap-1">
        <ExitButton />
        <EditableProjectName />
      </div>
      <nav className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => setShowShortcuts(true)}
          title={t('editor.keyboardShortcuts')}
        >
          <Command className="size-4" />
        </Button>
        <LanguageToggle />
        <ThemeToggle />
        <ExportButton />
      </nav>
      <ShortcutsDialog isOpen={showShortcuts} onOpenChange={setShowShortcuts} />
    </header>
  )
}

function ExitButton() {
  const t = useTranslations()
  const [isExiting, setIsExiting] = useState(false)
  const router = useRouter()
  const editor = useEditor()

  const handleExit = async () => {
    if (isExiting) return
    setIsExiting(true)

    try {
      await editor.project.prepareExit()
      editor.project.closeProject()
    } catch (error) {
      console.error('Failed to prepare project exit:', error)
    } finally {
      editor.project.closeProject()
      router.push('/projects')
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={handleExit}
      disabled={isExiting}
      title={t('editor.exitProject')}
    >
      <ArrowLeft className="size-4" />
    </Button>
  )
}

function EditableProjectName() {
  const t = useTranslations()
  const editor = useEditor()
  const activeProject = editor.project.getActive()
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const originalNameRef = useRef('')

  const projectName = activeProject?.metadata.name || ''

  const startEditing = () => {
    if (isEditing) return
    originalNameRef.current = projectName
    setIsEditing(true)

    requestAnimationFrame(() => {
      inputRef.current?.select()
    })
  }

  const saveEdit = async () => {
    if (!inputRef.current || !activeProject) return
    const newName = inputRef.current.value.trim()
    setIsEditing(false)

    if (!newName) {
      inputRef.current.value = originalNameRef.current
      return
    }

    if (newName !== originalNameRef.current) {
      try {
        await editor.project.renameProject({
          id: activeProject.metadata.id,
          name: newName,
        })
      } catch (error) {
        toast.error(t('projects.renameFailed'), {
          description:
            error instanceof Error ? error.message : t('common.pleaseTryAgain'),
        })
      }
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      inputRef.current?.blur()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      if (inputRef.current) {
        inputRef.current.value = originalNameRef.current
      }
      setIsEditing(false)
      inputRef.current?.blur()
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={projectName}
      readOnly={!isEditing}
      onClick={startEditing}
      onBlur={saveEdit}
      onKeyDown={handleKeyDown}
      style={{ fieldSizing: 'content' }}
      className={cn(
        'text-[0.9rem] h-8 px-2 py-1 rounded-sm bg-transparent outline-none cursor-pointer hover:bg-accent hover:text-accent-foreground',
        isEditing && 'ring-1 ring-ring cursor-text hover:bg-transparent',
      )}
    />
  )
}

function AgentToggle() {
  const t = useTranslations()
  const isOpen = useAgentStore((s) => s.isOpen)
  const togglePanel = useAgentStore((s) => s.togglePanel)

  return (
    <Button
      variant={isOpen ? 'secondary' : 'ghost'}
      size="icon"
      onClick={togglePanel}
      title={t('editor.aiAgent')}
      className="size-8"
    >
      <Sparkles className="size-4" />
    </Button>
  )
}
