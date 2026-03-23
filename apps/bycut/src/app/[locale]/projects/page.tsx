'use client'

import { Button } from '@cdlab996/ui/components/button'
import { ButtonGroup } from '@cdlab996/ui/components/button-group'
import { Card, CardContent } from '@cdlab996/ui/components/card'
import { Checkbox } from '@cdlab996/ui/components/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@cdlab996/ui/components/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@cdlab996/ui/components/input-group'
import { Label } from '@cdlab996/ui/components/label'
import { Skeleton } from '@cdlab996/ui/components/skeleton'
import { IKEmpty } from '@cdlab996/ui/IK/IKEmpty'
import { cn } from '@cdlab996/ui/lib/utils'
import { format } from 'date-fns'
import {
  AlignStartVertical,
  ArrowDown,
  Calendar,
  ChevronRight,
  Copy,
  Ellipsis,
  Info,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Trash2,
  // User,
  Video,
} from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { KeyboardEvent, MouseEvent } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DeleteProjectDialog } from '@/components/editor/dialogs/delete-project-dialog'
import { MigrationDialog } from '@/components/editor/dialogs/migration-dialog'
import { ProjectInfoDialog } from '@/components/editor/dialogs/project-info-dialog'
import { CreateProjectDialog } from '@/components/editor/dialogs/create-project-dialog'
import { RenameProjectDialog } from '@/components/editor/dialogs/rename-project-dialog'
import {
  LanguageSelector as LanguageToggle,
  ThemeToggle,
} from '@/components/layout'
import { useEditor } from '@/hooks/use-editor'
import { Link, useRouter } from '@/lib/navigation'
import { formatTimeCode } from '@/lib/time'
import type { TProjectMetadata, TProjectSortOption } from '@/types/project'
import { StorageIndicator } from './storage-indicator'
import { useProjectsStore } from './store'

const formatProjectDuration = ({
  duration,
}: {
  duration: number | undefined
}): string | null => {
  if (duration === undefined) {
    return null
  }

  const format = duration >= 3600 ? 'HH:MM:SS' : 'MM:SS'
  return formatTimeCode({ timeInSeconds: duration, format })
}

const VIEW_MODE_OPTIONS = [
  { mode: 'grid' as const, Icon: LayoutGrid, label: 'Grid view' },
  { mode: 'list' as const, Icon: AlignStartVertical, label: 'List view' },
]

export default function ProjectsPage() {
  const { searchQuery, sortKey, sortOrder, viewMode } = useProjectsStore()
  const editor = useEditor()

  useEffect(() => {
    if (!editor.project.getIsInitialized()) {
      void editor.project.loadAllProjects()
    }
  }, [editor.project])

  const sortOption: TProjectSortOption = `${sortKey}-${sortOrder}`
  const projectsToDisplay = editor.project.getFilteredAndSortedProjects({
    searchQuery,
    sortOption,
  })

  const isLoading = editor.project.getIsLoading()
  const isInitialized = editor.project.getIsInitialized()

  return (
    <div className="min-h-screen">
      <MigrationDialog />
      <ProjectsHeader />
      <ProjectsToolbar projectIds={projectsToDisplay.map((p) => p.id)} />
      <main className="mx-auto px-4 pt-2 pb-6 flex flex-col gap-4">
        {isLoading || !isInitialized ? (
          <ProjectsSkeleton />
        ) : projectsToDisplay.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'xs:grid-cols-2 grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-4 px-4'
                : 'flex flex-col'
            }
          >
            {projectsToDisplay.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                allProjectIds={projectsToDisplay.map((p) => p.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ProjectsHeader() {
  const t = useTranslations()
  const { viewMode, isHydrated, setViewMode } = useProjectsStore()

  return (
    <header className="sticky top-0 z-20 px-8 flex flex-col gap-2">
      <div className="flex items-center justify-between h-16 pt-2">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="https://notes-wudi.pages.dev/images/logo.png"
                alt="Cutia Logo"
                width={24}
                height={24}
              />
              <span className="text-base font-bold tracking-tight">ByCut</span>
            </Link>
          </div>

          <ButtonGroup className="hidden md:flex">
            {VIEW_MODE_OPTIONS.map(({ mode, Icon, label }) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode({ viewMode: mode })}
                aria-label={label}
                aria-pressed={isHydrated && viewMode === mode}
              >
                <Icon className="size-4" />
              </Button>
            ))}
          </ButtonGroup>
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <StorageIndicator />
          <SearchBar className="hidden md:block" />
          {/* <Link href="/characters">
            <Button variant="outline">
              <User className="size-4" />
              <span className="hidden sm:inline">{t('nav.characters')}</span>
            </Button>
          </Link> */}
          <NewProjectButton />
        </div>
      </div>
      <SearchBar className="block md:hidden mb-4" />
    </header>
  )
}

function ProjectsToolbar({ projectIds }: { projectIds: string[] }) {
  const t = useTranslations()
  const {
    selectedProjectIds,
    sortKey,
    sortOrder,
    setSortOrder,
    setSelectedProjects,
    clearSelectedProjects,
    viewMode,
    setViewMode,
  } = useProjectsStore()

  const selectedProjectCount = selectedProjectIds.length
  const isAllSelected =
    projectIds.length > 0 && selectedProjectCount === projectIds.length
  const hasSomeSelected =
    selectedProjectCount > 0 && selectedProjectCount < projectIds.length

  const handleSelectAll = ({ checked }: { checked: boolean }) => {
    if (checked) {
      setSelectedProjects({ projectIds })
      return
    }
    clearSelectedProjects()
  }

  return (
    <div className="sticky top-16 z-10 flex items-center justify-between px-6 h-14 pt-2">
      <div className="flex items-center gap-2">
        <Label
          className="flex items-center gap-3 cursor-pointer px-2"
          htmlFor="select-all-projects"
        >
          <Checkbox
            id="select-all-projects"
            checked={
              isAllSelected ? true : hasSomeSelected ? 'indeterminate' : false
            }
            onCheckedChange={(checked) =>
              handleSelectAll({ checked: checked === true })
            }
          />
          <span className="text-muted-foreground hidden md:block">
            {t('common.selectAll')}
          </span>
        </Label>

        <div className="h-4 w-px bg-border/50" />

        <SortDropdown>
          <Button variant="ghost" className="text-muted-foreground pl-2">
            {t(
              sortKey === 'createdAt'
                ? 'common.created'
                : sortKey === 'updatedAt'
                  ? 'common.modified'
                  : sortKey === 'name'
                    ? 'common.name'
                    : 'common.duration',
            )}
          </Button>
        </SortDropdown>
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={() =>
            setSortOrder({
              sortOrder: sortOrder === 'asc' ? 'desc' : 'asc',
            })
          }
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              setSortOrder({
                sortOrder: sortOrder === 'asc' ? 'desc' : 'asc',
              })
            }
          }}
          aria-label={
            sortOrder === 'asc' ? t('common.ascending') : t('common.descending')
          }
        >
          <ArrowDown className={sortOrder === 'asc' ? 'rotate-180' : ''} />
        </Button>

        <div className="h-4 w-px bg-border/50 block md:hidden" />

        <div className="flex md:hidden items-center gap-4">
          {VIEW_MODE_OPTIONS.map(({ mode, Icon, label }) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'secondary' : 'ghost'}
              onClick={() => setViewMode({ viewMode: mode })}
              aria-label={label}
            >
              <Icon
                className={cn(
                  viewMode === mode ? 'text-primary' : 'text-muted-foreground',
                )}
              />
            </Button>
          ))}
        </div>
      </div>
      {selectedProjectCount > 0 ? <ProjectActions /> : null}
    </div>
  )
}

function SearchBar({
  className,
  collapsed,
}: {
  className?: string
  collapsed?: boolean
}) {
  const t = useTranslations()
  const { searchQuery, setSearchQuery } = useProjectsStore()

  return (
    <>
      {collapsed ? (
        <div className="block md:hidden">
          <Button
            size="icon"
            variant="outline"
            className="size-10.5 rounded-full"
          >
            <Search className="size-4" />
          </Button>
        </div>
      ) : (
        <div className={cn('relative', className)}>
          <InputGroup>
            <InputGroupInput
              placeholder={t('common.searchPlaceholder')}
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery({ query: event.target.value })
              }
            />
            <InputGroupAddon align="inline-start">
              <Search className="size-4" />
            </InputGroupAddon>
          </InputGroup>
        </div>
      )}
    </>
  )
}

const PROJECT_ACTIONS = [
  {
    id: 'duplicate',
    labelKey: 'common.duplicate',
    icon: Copy,
    variant: 'outline' as const,
  },
  {
    id: 'delete',
    labelKey: 'common.delete',
    icon: Trash2,
    variant: 'destructive' as const,
  },
] as const

async function deleteProjects({
  editor,
  ids,
}: {
  editor: ReturnType<typeof useEditor>
  ids: string[]
}) {
  await editor.project.deleteProjects({ ids })
}

async function duplicateProjects({
  editor,
  ids,
}: {
  editor: ReturnType<typeof useEditor>
  ids: string[]
}) {
  await editor.project.duplicateProjects({ ids })
}

async function renameProject({
  editor,
  id,
  name,
}: {
  editor: ReturnType<typeof useEditor>
  id: string
  name: string
}) {
  await editor.project.renameProject({ id, name })
}

function ProjectActions() {
  const t = useTranslations()
  const editor = useEditor()
  const { selectedProjectIds, clearSelectedProjects } = useProjectsStore()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const savedProjects = editor.project.getSavedProjects()
  const selectedProjectNames = savedProjects
    .filter((project) => selectedProjectIds.includes(project.id))
    .map((project) => project.name)

  const handleDuplicate = async () => {
    await duplicateProjects({ editor, ids: selectedProjectIds })
    clearSelectedProjects()
  }

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    await deleteProjects({ editor, ids: selectedProjectIds })
    clearSelectedProjects()
    setIsDeleteDialogOpen(false)
  }

  const actionHandlers: Record<string, () => void> = {
    duplicate: handleDuplicate,
    delete: handleDeleteClick,
  }

  return (
    <>
      <div className="flex items-center gap-2.5 px-3">
        <div className="hidden sm:flex items-center gap-2.5">
          {PROJECT_ACTIONS.map((action) => (
            <Button
              key={action.id}
              size="icon"
              variant={action.variant}
              onClick={actionHandlers[action.id]}
            >
              <action.icon className="size-4" />
            </Button>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild className="sm:hidden">
            <Button size="icon" variant="outline">
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PROJECT_ACTIONS.map((action) => (
              <DropdownMenuItem
                key={action.id}
                variant={action.id === 'delete' ? 'destructive' : undefined}
                onClick={actionHandlers[action.id]}
              >
                <action.icon className="size-4" />
                {t(action.labelKey)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DeleteProjectDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        projectNames={selectedProjectNames}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}

function SortDropdown({ children }: { children: React.ReactNode }) {
  const t = useTranslations()
  const { sortKey, setSortKey } = useProjectsStore()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="center">
        <DropdownMenuCheckboxItem
          checked={sortKey === 'createdAt'}
          onCheckedChange={() => setSortKey({ sortKey: 'createdAt' })}
        >
          {t('common.created')}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={sortKey === 'updatedAt'}
          onCheckedChange={() => setSortKey({ sortKey: 'updatedAt' })}
        >
          {t('common.modified')}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={sortKey === 'name'}
          onCheckedChange={() => setSortKey({ sortKey: 'name' })}
        >
          {t('common.name')}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={sortKey === 'duration'}
          onCheckedChange={() => setSortKey({ sortKey: 'duration' })}
        >
          {t('common.duration')}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NewProjectButton() {
  const t = useTranslations()
  const editor = useEditor()
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleCreateProject = async (name: string) => {
    setIsDialogOpen(false)
    const projectId = await editor.project.createNewProject({ name })
    router.push({
      pathname: '/editor',
      query: { projectId },
    })
  }

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)}>
        <span className="text-sm font-medium hidden md:block">
          {t('projects.new')}
        </span>
        <span className="text-sm font-medium block md:hidden">
          {t('common.new')}
        </span>
      </Button>
      <CreateProjectDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConfirm={handleCreateProject}
      />
    </>
  )
}

function ProjectItem({
  project,
  allProjectIds,
}: {
  project: TProjectMetadata
  allProjectIds: string[]
}) {
  const t = useTranslations()
  const {
    selectedProjectIds,
    viewMode,
    setProjectSelected,
    selectProjectRange,
  } = useProjectsStore()
  const selectedProjectIdSet = new Set(selectedProjectIds)
  const isSelected = selectedProjectIdSet.has(project.id)
  const selectedProjectCount = selectedProjectIds.length
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const durationLabel = formatProjectDuration({ duration: project.duration })
  const isMultiSelect = selectedProjectCount > 1
  const isGridView = viewMode === 'grid'

  const handleCheckboxChange = ({
    checked,
    shiftKey,
  }: {
    checked: boolean
    shiftKey: boolean
  }) => {
    if (shiftKey && checked) {
      selectProjectRange({ projectId: project.id, allProjectIds })
      return
    }
    setProjectSelected({ projectId: project.id, isSelected: checked })
  }

  const gridContent = (
    <Card className="group relative gap-2 overflow-hidden p-3 transition-all duration-300 hover:ring-2 hover:ring-primary border-0">
      <div className="bg-muted relative aspect-video">
        <div className="relative aspect-4/3 overflow-hidden rounded-xs bg-background">
          {project.thumbnail ? (
            <Image
              src={project.thumbnail}
              alt={t('projects.thumbnail')}
              fill
              className="object-contain transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Video className="text-muted-foreground size-12 shrink-0" />
            </div>
          )}
        </div>

        {durationLabel && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-sm">
            {durationLabel}
          </div>
        )}
      </div>

      <CardContent className="flex items-center justify-between gap-2 px-0">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="group-hover:text-foreground/90 line-clamp-2 text-sm leading-snug font-medium">
            {project.name}
          </h3>
          <div className="flex items-center gap-1 text-xs text-white/50 transition-all duration-300 group-hover:text-white/70">
            <Calendar className="size-3.5" />
            <span>
              {t('projects.createdDate', {
                date: format(
                  new Date(project.createdAt),
                  'yyyy-MM-dd HH:mm:ss',
                ),
              })}
            </span>
          </div>
        </div>
        <ChevronRight className="size-4 text-white/50 transition-colors duration-300 group-hover:text-foreground/90" />
      </CardContent>
    </Card>
  )

  const listRowContent = (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="bg-muted relative size-10 rounded overflow-hidden shrink-0">
        {project.thumbnail ? (
          <Image
            src={project.thumbnail}
            alt={t('projects.thumbnail')}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Video className="text-muted-foreground size-5 shrink-0" />
          </div>
        )}
      </div>

      <h3 className="group-hover:text-foreground/90 text-sm font-medium truncate flex-1 min-w-0">
        {project.name}
      </h3>

      <span className="text-muted-foreground text-sm shrink-0 hidden sm:block">
        {durationLabel ?? '—'}
      </span>

      <span className="text-muted-foreground text-sm shrink-0 w-auto pl-8 text-right hidden xs:block">
        {format(new Date(project.createdAt), 'yyyy-MM-dd HH:mm:ss')}
      </span>
    </div>
  )

  const listContent = (
    <div
      className={`flex items-center gap-4 py-2 px-4 border-b border-border/50`}
    >
      <Checkbox
        checked={isSelected}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          handleCheckboxChange({
            checked: !isSelected,
            shiftKey: event.shiftKey,
          })
        }}
        onCheckedChange={() => {}}
      />

      <Link
        href={{ pathname: '/editor', query: { projectId: project.id } }}
        className="flex-1 min-w-0"
      >
        {listRowContent}
      </Link>

      {!isMultiSelect && (
        <ProjectMenu
          isOpen={isDropdownOpen}
          onOpenChange={setIsDropdownOpen}
          project={project}
          variant="list"
        />
      )}
    </div>
  )

  const cardContent = isGridView ? gridContent : listContent

  if (!isGridView) {
    return <div className="group relative">{listContent}</div>
  }

  return (
    <div className="group relative">
      <Link
        href={{ pathname: '/editor', query: { projectId: project.id } }}
        className="block"
      >
        {cardContent}
      </Link>

      {isGridView && (
        <>
          <Checkbox
            checked={isSelected}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              handleCheckboxChange({
                checked: !isSelected,
                shiftKey: event.shiftKey,
              })
            }}
            onCheckedChange={() => {}}
            className={`absolute z-10 top-3 left-3 ${
              isSelected || isDropdownOpen
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            }`}
          />

          {!isMultiSelect && (
            <ProjectMenu
              isOpen={isDropdownOpen}
              onOpenChange={setIsDropdownOpen}
              project={project}
            />
          )}
        </>
      )}
    </div>
  )
}

function ProjectMenu({
  isOpen,
  onOpenChange,
  project,
  variant = 'grid',
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  project: TProjectMetadata
  variant?: 'grid' | 'list'
}) {
  const t = useTranslations()
  const editor = useEditor()
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false)

  const handleMenuClick = ({
    event,
  }: {
    event: MouseEvent<HTMLButtonElement>
  }) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleMenuKeyDown = ({
    event,
  }: {
    event: KeyboardEvent<HTMLButtonElement>
  }) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }
    event.preventDefault()
    event.stopPropagation()
  }

  const handleRename = () => {
    setIsRenameDialogOpen(true)
    onOpenChange(false)
  }

  const handleDuplicate = async () => {
    await duplicateProjects({ editor, ids: [project.id] })
    onOpenChange(false)
  }

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true)
    onOpenChange(false)
  }

  const handleDeleteConfirm = async () => {
    await deleteProjects({ editor, ids: [project.id] })
    setIsDeleteDialogOpen(false)
  }

  const handleInfoClick = () => {
    setIsInfoDialogOpen(true)
    onOpenChange(false)
  }

  const isGrid = variant === 'grid'

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            aria-label={t('editor.menu.title')}
            className={
              isGrid
                ? `absolute z-10 top-3 right-3 ${isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`
                : 'bg-transparent! shadow-none!'
            }
            size="icon"
            onClick={(event) =>
              handleMenuClick({
                event: event as unknown as MouseEvent<HTMLButtonElement>,
              })
            }
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) =>
              handleMenuKeyDown({
                event: event as unknown as KeyboardEvent<HTMLButtonElement>,
              })
            }
          >
            <Ellipsis className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end">
          <DropdownMenuItem onClick={handleRename}>
            <Pencil />
            {t('common.rename')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy />
            {t('common.duplicate')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleInfoClick}>
            <Info />
            {t('common.info')}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
            <Trash2 />
            {t('common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameProjectDialog
        isOpen={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        projectName={project.name}
        onConfirm={async (newName) => {
          await renameProject({ editor, id: project.id, name: newName })
          setIsRenameDialogOpen(false)
        }}
      />

      <DeleteProjectDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        projectNames={[project.name]}
        onConfirm={handleDeleteConfirm}
      />

      <ProjectInfoDialog
        isOpen={isInfoDialogOpen}
        onOpenChange={setIsInfoDialogOpen}
        project={project}
      />
    </>
  )
}

function ProjectsSkeleton() {
  const skeletonIds = Array.from(
    { length: 12 },
    (_, index) => `skeleton-${index}`,
  )

  return (
    <div className="px-4 xs:grid-cols-2 grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {skeletonIds.map((skeletonId) => (
        <Card
          key={skeletonId}
          className="bg-background overflow-hidden border-none p-0"
        >
          <div className="bg-muted relative aspect-video">
            <div className="absolute inset-0">
              <Skeleton className="bg-muted/50 size-full" />
            </div>
          </div>
          <CardContent className="flex flex-col gap-2 px-0 pt-4">
            <Skeleton className="bg-muted/50 h-4 w-3/4" />
            <div className="text-muted-foreground flex items-center gap-1.5">
              <Skeleton className="bg-muted/50 size-4" />
              <Skeleton className="bg-muted/50 h-4 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState() {
  const t = useTranslations()
  const { searchQuery, setSearchQuery } = useProjectsStore()
  const router = useRouter()
  const editor = useEditor()
  const savedProjects = editor.project.getSavedProjects()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleCreateProject = async (name: string) => {
    try {
      setIsDialogOpen(false)
      const projectId = await editor.project.createNewProject({ name })
      router.push({
        pathname: '/editor',
        query: { projectId },
      })
    } catch (error) {
      toast.error(t('projects.createFailed'), {
        description:
          error instanceof Error ? error.message : t('common.pleaseTryAgain'),
      })
    }
  }

  if (savedProjects.length > 0) {
    return (
      <IKEmpty
        icon={Search}
        title={t('common.noResults')}
        description={t('projects.searchNoResults', { query: searchQuery })}
        className="py-16"
      >
        <Button
          onClick={() => setSearchQuery({ query: '' })}
          variant="outline"
          size="lg"
        >
          {t('projects.clearSearch')}
        </Button>
      </IKEmpty>
    )
  }

  return (
    <IKEmpty
      icon={Video}
      title={t('projects.noProjects')}
      description={t('projects.createFirstDesc')}
      className="py-16"
    >
      <Button size="lg" onClick={() => setIsDialogOpen(true)}>
        <Plus />
        {t('projects.createFirst')}
      </Button>
      <CreateProjectDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConfirm={handleCreateProject}
      />
    </IKEmpty>
  )
}
