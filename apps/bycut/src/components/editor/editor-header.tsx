'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@cdlab996/ui/components/dropdown-menu'
import { cn } from '@cdlab996/ui/lib/utils'
import { ArrowLeft, Command, Sparkles } from 'lucide-react'
import Image from 'next/image'
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
import { DeleteProjectDialog } from './dialogs/delete-project-dialog'
import { RenameProjectDialog } from './dialogs/rename-project-dialog'
import { ShortcutsDialog } from './dialogs/shortcuts-dialog'
import { ExportButton } from './export-button'

export function EditorHeader() {
  return (
    <header className="flex h-[3.4rem] items-center justify-between px-3 pt-0.5">
      <div className="flex items-center gap-1">
        <ProjectDropdown />
        <EditableProjectName />
      </div>
      <nav className="flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
        <ExportButton />
      </nav>
    </header>
  )
}

function ProjectDropdown() {
  const t = useTranslations()
  const [openDialog, setOpenDialog] = useState<
    'delete' | 'rename' | 'shortcuts' | null
  >(null)
  const [isExiting, setIsExiting] = useState(false)
  const router = useRouter()
  const editor = useEditor()
  const activeProject = editor.project.getActive()

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

  const handleSaveProjectName = async (newName: string) => {
    if (
      activeProject &&
      newName.trim() &&
      newName !== activeProject.metadata.name
    ) {
      try {
        await editor.project.renameProject({
          id: activeProject.metadata.id,
          name: newName.trim(),
        })
      } catch (error) {
        toast.error(t('projects.renameFailed'), {
          description:
            error instanceof Error ? error.message : t('common.pleaseTryAgain'),
        })
      } finally {
        setOpenDialog(null)
      }
    }
  }

  const handleDeleteProject = async () => {
    if (activeProject) {
      try {
        await editor.project.deleteProjects({
          ids: [activeProject.metadata.id],
        })
        router.push('/projects')
      } catch (error) {
        toast.error(t('projects.deleteFailed'), {
          description:
            error instanceof Error ? error.message : t('common.pleaseTryAgain'),
        })
      } finally {
        setOpenDialog(null)
      }
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="p-1 rounded-sm size-8">
            <Image
              src="https://notes-wudi.pages.dev/images/logo.png"
              alt="Project thumbnail"
              width={32}
              height={32}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-100 w-52">
          <DropdownMenuItem
            className="flex items-center gap-1.5"
            onClick={handleExit}
            disabled={isExiting}
          >
            <ArrowLeft className="size-4" />
            {t('editor.exitProject')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center gap-1.5"
            onClick={() => setOpenDialog('shortcuts')}
          >
            <Command className="size-4" />
            {t('editor.keyboardShortcuts')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameProjectDialog
        isOpen={openDialog === 'rename'}
        onOpenChange={(isOpen) => setOpenDialog(isOpen ? 'rename' : null)}
        onConfirm={(newName) => handleSaveProjectName(newName)}
        projectName={activeProject?.metadata.name || ''}
      />
      <DeleteProjectDialog
        isOpen={openDialog === 'delete'}
        onOpenChange={(isOpen) => setOpenDialog(isOpen ? 'delete' : null)}
        onConfirm={handleDeleteProject}
        projectNames={[activeProject?.metadata.name || '']}
      />
      <ShortcutsDialog
        isOpen={openDialog === 'shortcuts'}
        onOpenChange={(isOpen) => setOpenDialog(isOpen ? 'shortcuts' : null)}
      />
    </>
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
