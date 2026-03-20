'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@cdlab996/ui/components/context-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cdlab996/ui/components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@cdlab996/ui/components/dropdown-menu'
import { Input } from '@cdlab996/ui/components/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cdlab996/ui/components/tooltip'
import { cn } from '@cdlab996/ui/lib/utils'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpDown,
  CloudUpload,
  Image as ImageIcon,
  LayoutGrid,
  Link,
  List,
  Monitor,
  Music,
  Video,
} from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MediaDragOverlay } from '@/components/editor/panels/assets/drag-overlay'
import { DraggableItem } from '@/components/editor/panels/assets/draggable-item'
import { TIMELINE_CONSTANTS } from '@/constants/timeline-constants'
import { useEditor } from '@/hooks/use-editor'
import { useFileUpload } from '@/hooks/use-file-upload'
import { useRevealItem } from '@/hooks/use-reveal-item'
import { processMediaAssets } from '@/lib/media/processing'
import { fetchRemoteMediaAsFile } from '@/lib/media/url-import'
import {
  buildImageElement,
  buildUploadAudioElement,
  buildVideoElement,
} from '@/lib/timeline/element-utils'
import { useAssetsPanelStore } from '@/stores/assets-panel-store'
import { useMediaPreviewStore } from '@/stores/media-preview-store'
import type { MediaAsset } from '@/types/assets'
import type { CreateTimelineElement } from '@/types/timeline'

export function MediaView() {
  const t = useTranslations()
  const editor = useEditor()
  const mediaFiles = editor.media.getAssets()
  const activeProject = editor.project.getActive()

  const { mediaViewMode, setMediaViewMode, highlightMediaId, clearHighlight } =
    useAssetsPanelStore()
  const { highlightedId, registerElement } = useRevealItem(
    highlightMediaId,
    clearHighlight,
  )

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'duration' | 'size'>(
    'name',
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [isUrlImporting, setIsUrlImporting] = useState(false)

  const processFiles = async ({ files }: { files: FileList | File[] }) => {
    if (!files || files.length === 0) return
    if (!activeProject) {
      toast.error(t('editor.noActiveProject'))
      return
    }

    setIsProcessing(true)
    setProgress(0)
    try {
      const processedAssets = await processMediaAssets({
        files,
        onProgress: (progress: { progress: number }) =>
          setProgress(progress.progress),
      })
      for (const asset of processedAssets) {
        await editor.media.addMediaAsset({
          projectId: activeProject.metadata.id,
          asset,
        })
      }
    } catch (error) {
      console.error('Error processing files:', error)
      toast.error(t('media.processFailed'))
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }

  const handleUrlImport = async () => {
    const trimmedUrl = urlInput.trim()
    if (!trimmedUrl) return

    try {
      new URL(trimmedUrl)
    } catch {
      toast.error(t('media.invalidUrl'))
      return
    }

    setIsUrlImporting(true)
    try {
      const file = await fetchRemoteMediaAsFile({ url: trimmedUrl })
      await processFiles({ files: [file] })
      setIsUrlDialogOpen(false)
      setUrlInput('')
      toast.success(t('media.importSuccess'))
    } catch (error) {
      console.error('Error importing from URL:', error)
      toast.error(
        error instanceof Error ? error.message : t('media.importFailed'),
      )
    } finally {
      setIsUrlImporting(false)
    }
  }

  const { isDragOver, dragProps, openFilePicker, fileInputProps } =
    useFileUpload({
      accept: 'image/*,video/*,audio/*',
      multiple: true,
      onFilesSelected: (files) => processFiles({ files }),
    })

  const handleRemove = async ({
    event,
    id,
  }: {
    event: React.MouseEvent
    id: string
  }) => {
    event.stopPropagation()

    if (!activeProject) {
      toast.error(t('editor.noActiveProject'))
      return
    }

    await editor.media.removeMediaAsset({
      projectId: activeProject.metadata.id,
      id,
    })
  }

  const handleExportClip = ({ item }: { item: MediaAsset }) => {
    try {
      const downloadUrl = URL.createObjectURL(item.file)
      const linkElement = document.createElement('a')
      linkElement.href = downloadUrl
      linkElement.download = item.file.name || item.name
      document.body.append(linkElement)
      linkElement.click()
      linkElement.remove()
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 0)
      toast.success(t('misc.clipDownloaded'))
    } catch (error) {
      console.error('Failed to export clip:', error)
      toast.error(t('misc.clipDownloadFailed'))
    }
  }

  const addElementAtTime = ({
    asset,
    startTime,
  }: {
    asset: MediaAsset
    startTime: number
  }): boolean => {
    const element = createElementFromMedia({ asset, startTime })
    editor.timeline.insertElement({
      element,
      placement: { mode: 'auto' },
    })
    return true
  }

  const filteredMediaItems = useMemo(() => {
    const filtered = mediaFiles.filter((item) => !item.ephemeral)

    filtered.sort((a, b) => {
      let valueA: string | number
      let valueB: string | number

      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
          break
        case 'type':
          valueA = a.type
          valueB = b.type
          break
        case 'duration':
          valueA = a.duration || 0
          valueB = b.duration || 0
          break
        case 'size':
          valueA = a.file.size
          valueB = b.file.size
          break
        default:
          return 0
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [mediaFiles, sortBy, sortOrder])

  const previewComponents = useMemo(() => {
    const previews = new Map<string, React.ReactNode>()

    filteredMediaItems.forEach((item) => {
      previews.set(item.id, <MediaPreview item={item} />)
      previews.set(
        `compact-${item.id}`,
        <MediaPreview item={item} variant="compact" />,
      )
    })

    return previews
  }, [filteredMediaItems])

  const renderPreview = (item: MediaAsset) => previewComponents.get(item.id)
  const renderCompactPreview = (item: MediaAsset) =>
    previewComponents.get(`compact-${item.id}`)

  const selectedMediaId = useMediaPreviewStore((state) => state.selectedMediaId)

  const handleSelectMedia = ({ asset }: { asset: MediaAsset }) => {
    const store = useMediaPreviewStore.getState()
    if (store.selectedMediaId === asset.id) {
      store.clearSelection()
    } else {
      store.selectMedia({ mediaId: asset.id })
    }
  }

  const handleClearSelection = () => {
    useMediaPreviewStore.getState().clearSelection()
  }

  return (
    <>
      <input {...fileInputProps} />

      <div
        className={`relative flex h-full flex-col gap-1 ${isDragOver ? 'bg-accent/30' : ''}`}
        {...dragProps}
      >
        <div className="h-12 px-4 pr-2 flex items-center justify-between border-b">
          <span className="text-muted-foreground text-sm">
            {t('assets.title')}
          </span>
          <div className="flex items-center gap-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setMediaViewMode(
                        mediaViewMode === 'grid' ? 'list' : 'grid',
                      )
                    }
                    disabled={isProcessing}
                    className="items-center justify-center"
                  >
                    {mediaViewMode === 'grid' ? <List /> : <LayoutGrid />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {mediaViewMode === 'grid'
                      ? t('projects.listView')
                      : t('projects.gridView')}
                  </p>
                </TooltipContent>
                <Tooltip>
                  <DropdownMenu>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={isProcessing}
                          className="items-center justify-center"
                        >
                          <ArrowUpDown />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <DropdownMenuContent align="end">
                      <SortMenuItem
                        label={t('common.name')}
                        sortKey="name"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={({ key }) => {
                          if (sortBy === key) {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortBy(key)
                            setSortOrder('asc')
                          }
                        }}
                      />
                      <SortMenuItem
                        label={t('common.type')}
                        sortKey="type"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={({ key }) => {
                          if (sortBy === key) {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortBy(key)
                            setSortOrder('asc')
                          }
                        }}
                      />
                      <SortMenuItem
                        label={t('common.duration')}
                        sortKey="duration"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={({ key }) => {
                          if (sortBy === key) {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortBy(key)
                            setSortOrder('asc')
                          }
                        }}
                      />
                      <SortMenuItem
                        label={t('media.fileSize')}
                        sortKey="size"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={({ key }) => {
                          if (sortBy === key) {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortBy(key)
                            setSortOrder('asc')
                          }
                        }}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <TooltipContent>
                    <p>
                      {t('projects.sortBy', {
                        sortBy,
                        sortOrder:
                          sortOrder === 'asc'
                            ? t('common.ascending')
                            : t('common.descending'),
                      })}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isProcessing}
                  size="sm"
                  className="items-center justify-center gap-1.5 ml-1.5 hover:bg-accent px-3"
                >
                  <CloudUpload />
                  {t('common.import')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openFilePicker} className="gap-2">
                  <Monitor className="size-4" />
                  {t('media.fromDevice')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsUrlDialogOpen(true)}
                  className="gap-2"
                >
                  <Link className="size-4" />
                  {t('media.fromUrl')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* biome-ignore lint: deselect on empty space click */}
        <div
          className="scrollbar-thin size-full overflow-y-auto"
          onClick={(event) => {
            if (event.target === event.currentTarget) handleClearSelection()
          }}
        >
          {/* biome-ignore lint: deselect on empty space click */}
          <div
            className="w-full flex-1 p-2 pt-1"
            onClick={(event) => {
              if (event.target === event.currentTarget) handleClearSelection()
            }}
          >
            {isDragOver || filteredMediaItems.length === 0 ? (
              <MediaDragOverlay
                isVisible={true}
                isProcessing={isProcessing}
                progress={progress}
                onClick={openFilePicker}
              />
            ) : mediaViewMode === 'grid' ? (
              <GridView
                items={filteredMediaItems}
                renderPreview={renderPreview}
                onRemove={handleRemove}
                onExportClip={handleExportClip}
                onAddToTimeline={addElementAtTime}
                onSelect={handleSelectMedia}
                selectedMediaId={selectedMediaId}
                highlightedId={highlightedId}
                registerElement={registerElement}
              />
            ) : (
              <ListView
                items={filteredMediaItems}
                renderPreview={renderCompactPreview}
                onRemove={handleRemove}
                onExportClip={handleExportClip}
                onAddToTimeline={addElementAtTime}
                onSelect={handleSelectMedia}
                selectedMediaId={selectedMediaId}
                highlightedId={highlightedId}
                registerElement={registerElement}
              />
            )}
          </div>
        </div>
      </div>

      <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('media.importFromUrl')}</DialogTitle>
            <DialogDescription>{t('media.urlDescription')}</DialogDescription>
          </DialogHeader>
          <div>
            <Input
              placeholder={t('media.enterUrl')}
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isUrlImporting) {
                  void handleUrlImport()
                }
              }}
              disabled={isUrlImporting}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUrlDialogOpen(false)}
              disabled={isUrlImporting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleUrlImport}
              disabled={isUrlImporting || !urlInput.trim()}
            >
              {isUrlImporting ? t('media.importing') : t('common.import')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MediaItemWithContextMenu({
  item,
  children,
  onRemove,
  onExportClip,
}: {
  item: MediaAsset
  children: React.ReactNode
  onRemove: ({ event, id }: { event: React.MouseEvent; id: string }) => void
  onExportClip: ({ item }: { item: MediaAsset }) => void
}) {
  const t = useTranslations()

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onExportClip({ item })}>
          {t('export.clips')}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            navigator.clipboard.writeText(item.id)
            toast.success(t('timeline.mediaIdCopied'))
          }}
        >
          {t('timeline.copyMediaId')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onClick={(event) => onRemove({ event, id: item.id })}
        >
          {t('common.delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function GridView({
  items,
  renderPreview,
  onRemove,
  onExportClip,
  onAddToTimeline,
  onSelect,
  selectedMediaId,
  highlightedId,
  registerElement,
}: {
  items: MediaAsset[]
  renderPreview: (item: MediaAsset) => React.ReactNode
  onRemove: ({ event, id }: { event: React.MouseEvent; id: string }) => void
  onExportClip: ({ item }: { item: MediaAsset }) => void
  onAddToTimeline: ({
    asset,
    startTime,
  }: {
    asset: MediaAsset
    startTime: number
  }) => boolean
  onSelect: ({ asset }: { asset: MediaAsset }) => void
  selectedMediaId: string | null
  highlightedId: string | null
  registerElement: (id: string, element: HTMLElement | null) => void
}) {
  return (
    <div
      className="grid gap-1.5"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      }}
    >
      {items.map((item) => (
        <div key={item.id} ref={(el) => registerElement(item.id, el)}>
          <MediaItemWithContextMenu
            item={item}
            onRemove={onRemove}
            onExportClip={onExportClip}
          >
            <DraggableItem
              name={item.name}
              preview={renderPreview(item)}
              dragData={{
                id: item.id,
                type: 'media',
                mediaType: item.type,
                name: item.name,
              }}
              shouldShowPlusOnDrag={false}
              onAddToTimeline={({ currentTime }) =>
                onAddToTimeline({ asset: item, startTime: currentTime })
              }
              onClick={() => onSelect({ asset: item })}
              isRounded={false}
              variant="card"
              containerClassName="w-full"
              isHighlighted={highlightedId === item.id}
              isSelected={selectedMediaId === item.id}
            />
          </MediaItemWithContextMenu>
        </div>
      ))}
    </div>
  )
}

function ListView({
  items,
  renderPreview,
  onRemove,
  onExportClip,
  onAddToTimeline,
  onSelect,
  selectedMediaId,
  highlightedId,
  registerElement,
}: {
  items: MediaAsset[]
  renderPreview: (item: MediaAsset) => React.ReactNode
  onRemove: ({ event, id }: { event: React.MouseEvent; id: string }) => void
  onExportClip: ({ item }: { item: MediaAsset }) => void
  onAddToTimeline: ({
    asset,
    startTime,
  }: {
    asset: MediaAsset
    startTime: number
  }) => boolean
  onSelect: ({ asset }: { asset: MediaAsset }) => void
  selectedMediaId: string | null
  highlightedId: string | null
  registerElement: (id: string, element: HTMLElement | null) => void
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.id} ref={(el) => registerElement(item.id, el)}>
          <MediaItemWithContextMenu
            item={item}
            onRemove={onRemove}
            onExportClip={onExportClip}
          >
            <DraggableItem
              name={item.name}
              preview={renderPreview(item)}
              dragData={{
                id: item.id,
                type: 'media',
                mediaType: item.type,
                name: item.name,
              }}
              shouldShowPlusOnDrag={false}
              onAddToTimeline={({ currentTime }) =>
                onAddToTimeline({ asset: item, startTime: currentTime })
              }
              onClick={() => onSelect({ asset: item })}
              variant="compact"
              isHighlighted={highlightedId === item.id}
              isSelected={selectedMediaId === item.id}
            />
          </MediaItemWithContextMenu>
        </div>
      ))}
    </div>
  )
}

const formatDuration = ({ duration }: { duration: number }) => {
  const min = Math.floor(duration / 60)
  const sec = Math.floor(duration % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function MediaDurationBadge({ duration }: { duration?: number }) {
  if (!duration) return null

  return (
    <div className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-xs text-white">
      {formatDuration({ duration })}
    </div>
  )
}

function MediaDurationLabel({ duration }: { duration?: number }) {
  if (!duration) return null

  return (
    <span className="text-xs opacity-70">{formatDuration({ duration })}</span>
  )
}

function MediaTypePlaceholder({
  Icon,
  label,
  duration,
  variant,
}: {
  Icon: LucideIcon
  label: string
  duration?: number
  variant: 'muted' | 'bordered'
}) {
  const iconClassName = cn('size-6', variant === 'bordered' && 'mb-1')

  return (
    <div
      className={cn(
        'text-muted-foreground flex size-full flex-col items-center justify-center rounded',
        variant === 'muted' ? 'bg-muted/30' : 'border',
      )}
    >
      <Icon className={iconClassName} />
      <span className="text-xs">{label}</span>
      <MediaDurationLabel duration={duration} />
    </div>
  )
}

function MediaPreview({
  item,
  variant = 'grid',
}: {
  item: MediaAsset
  variant?: 'grid' | 'compact'
}) {
  const t = useTranslations()
  const shouldShowDurationBadge = variant === 'grid'

  if (item.type === 'image') {
    return (
      <div className="relative flex size-full items-center justify-center">
        <Image
          src={item.url ?? ''}
          alt={item.name}
          fill
          sizes="100vw"
          className="object-cover"
          loading="lazy"
          unoptimized
        />
      </div>
    )
  }

  if (item.type === 'video') {
    if (item.thumbnailUrl) {
      return (
        <div className="relative size-full">
          <Image
            src={item.thumbnailUrl}
            alt={item.name}
            fill
            sizes="100vw"
            className="rounded object-cover"
            loading="lazy"
            unoptimized
          />
          {shouldShowDurationBadge ? (
            <MediaDurationBadge duration={item.duration} />
          ) : null}
        </div>
      )
    }

    return (
      <MediaTypePlaceholder
        Icon={Video}
        label={t('common.video')}
        duration={item.duration}
        variant="muted"
      />
    )
  }

  if (item.type === 'audio') {
    return (
      <MediaTypePlaceholder
        Icon={Music}
        label={t('common.audio')}
        duration={item.duration}
        variant="bordered"
      />
    )
  }

  return (
    <MediaTypePlaceholder
      Icon={ImageIcon}
      label={t('common.unknown')}
      variant="muted"
    />
  )
}

function SortMenuItem({
  label,
  sortKey,
  currentSortBy,
  currentSortOrder,
  onSort,
}: {
  label: string
  sortKey: 'name' | 'type' | 'duration' | 'size'
  currentSortBy: string
  currentSortOrder: 'asc' | 'desc'
  onSort: ({ key }: { key: 'name' | 'type' | 'duration' | 'size' }) => void
}) {
  const isActive = currentSortBy === sortKey
  const arrow = isActive ? (currentSortOrder === 'asc' ? '↑' : '↓') : ''

  return (
    <DropdownMenuItem onClick={() => onSort({ key: sortKey })}>
      {label} {arrow}
    </DropdownMenuItem>
  )
}

function createElementFromMedia({
  asset,
  startTime,
}: {
  asset: MediaAsset
  startTime: number
}): CreateTimelineElement {
  const duration = asset.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION

  switch (asset.type) {
    case 'video':
      return buildVideoElement({
        mediaId: asset.id,
        name: asset.name,
        duration,
        startTime,
      })
    case 'image':
      return buildImageElement({
        mediaId: asset.id,
        name: asset.name,
        duration,
        startTime,
      })
    case 'audio':
      return buildUploadAudioElement({
        mediaId: asset.id,
        name: asset.name,
        duration,
        startTime,
      })
    default:
      throw new Error(`Unsupported media type: ${asset.type}`)
  }
}
