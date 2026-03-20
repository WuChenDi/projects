'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cdlab996/ui/components/dialog'
import { Input } from '@cdlab996/ui/components/input'
import { Label } from '@cdlab996/ui/components/label'
import { Textarea } from '@cdlab996/ui/components/textarea'
import { ImagePlus, Loader2, Sparkles, Upload, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  analyzeImageWithVision,
  blobToDataUrl,
  DESCRIPTION_ANALYSIS_PROMPT,
  STYLE_ANALYSIS_PROMPT,
} from '@/lib/ai/vision'
import { useAgentStore } from '@/stores/agent-store'
import { useAISettingsStore } from '@/stores/ai-settings-store'
import {
  createImageThumbnailDataUrl,
  getCharacterImageBlob,
  storeCharacterImageBlob,
  useCharacterStore,
} from '@/stores/character-store'
import type { AICharacter, CharacterImage } from '@/types/character'
import { generateUUID } from '@/utils/id'
import type { ImageSource } from './image-lightbox'
import { ImageLightbox, useImageLightbox } from './image-lightbox'
import { generateCharacterPortrait } from './turnaround-generator'

interface CharacterCreatorProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  editCharacter?: AICharacter | null
}

export function CharacterCreatorDialog({
  isOpen,
  onOpenChange,
  editCharacter,
}: CharacterCreatorProps) {
  const t = useTranslations()
  const { addCharacter, updateCharacter, addImage, removeImage } =
    useCharacterStore()
  const { imageProviderId, imageApiKey } = useAISettingsStore()

  const isEditing = editCharacter !== null && editCharacter !== undefined

  const [name, setName] = useState(editCharacter?.name ?? '')
  const [description, setDescription] = useState(
    editCharacter?.description ?? '',
  )
  const [styleDescription, setStyleDescription] = useState(
    editCharacter?.styleDescription ?? '',
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const agentConfig = useAgentStore((s) => s.config)
  const isAgentConfigured = agentConfig.apiKey.length > 0
  const lightbox = useImageLightbox()
  const [previewImages, setPreviewImages] = useState<
    Array<{
      id: string
      thumbnailDataUrl: string
      label: string
      blobKey: string
      isNew: boolean
    }>
  >(
    editCharacter?.images.map((img) => ({
      id: img.id,
      thumbnailDataUrl: img.thumbnailDataUrl,
      label: img.label,
      blobKey: img.blobKey,
      isNew: false,
    })) ?? [],
  )
  const [pendingImages, setPendingImages] = useState<
    Map<string, CharacterImage>
  >(new Map())

  const isProviderConfigured =
    imageProviderId !== null && imageApiKey.length > 0

  const handleGenerateTurnaround = useCallback(async () => {
    if (!description.trim()) {
      toast.error(t('characters.enterDescriptionFirst'))
      return
    }
    setIsGenerating(true)
    try {
      const result = await generateCharacterPortrait({
        description: description.trim(),
      })

      const response = await fetch(result.url)
      const blob = await response.blob()

      const blobKey = generateUUID()
      await storeCharacterImageBlob({ id: blobKey, blob })
      const thumbnailDataUrl = await createImageThumbnailDataUrl({
        blob,
      })

      const imageId = generateUUID()
      const characterImage: CharacterImage = {
        id: imageId,
        label: 'Character Portrait',
        prompt: description.trim(),
        blobKey,
        thumbnailDataUrl,
        createdAt: new Date().toISOString(),
      }

      setPendingImages((prev) => new Map(prev).set(imageId, characterImage))
      setPreviewImages((prev) => [
        ...prev,
        {
          id: imageId,
          thumbnailDataUrl,
          label: 'Character Portrait',
          blobKey,
          isNew: true,
        },
      ])

      toast.success(t('characters.portraitGenerated'))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('characters.portraitFailed'),
      )
    } finally {
      setIsGenerating(false)
    }
  }, [description, t])

  const handleUploadImage = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/webp,image/gif'
    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) return

      try {
        const blob = new Blob([await file.arrayBuffer()], {
          type: file.type,
        })
        const blobKey = generateUUID()
        await storeCharacterImageBlob({ id: blobKey, blob })
        const thumbnailDataUrl = await createImageThumbnailDataUrl({
          blob,
        })

        const imageId = generateUUID()
        const characterImage: CharacterImage = {
          id: imageId,
          label: file.name.replace(/\.\w+$/, ''),
          prompt: '',
          blobKey,
          thumbnailDataUrl,
          createdAt: new Date().toISOString(),
        }

        setPendingImages((prev) => new Map(prev).set(imageId, characterImage))
        setPreviewImages((prev) => [
          ...prev,
          {
            id: imageId,
            thumbnailDataUrl,
            label: characterImage.label,
            blobKey,
            isNew: true,
          },
        ])
      } catch {
        toast.error(t('characters.uploadFailed'))
      }
    })
    input.click()
  }, [t])

  const handleRemovePreview = useCallback(
    ({ imageId }: { imageId: string }) => {
      setPreviewImages((prev) => prev.filter((p) => p.id !== imageId))
      setPendingImages((prev) => {
        const next = new Map(prev)
        next.delete(imageId)
        return next
      })
      if (isEditing && editCharacter) {
        const existingImage = editCharacter.images.find((i) => i.id === imageId)
        if (existingImage) {
          removeImage({ characterId: editCharacter.id, imageId })
        }
      }
    },
    [isEditing, editCharacter, removeImage],
  )

  const resetForm = useCallback(() => {
    setName('')
    setDescription('')
    setStyleDescription('')
    setPreviewImages([])
    setPendingImages(new Map())
  }, [])

  const handleSave = useCallback(() => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error(t('characters.enterName'))
      return
    }

    const trimmedStyleDesc = styleDescription.trim() || undefined

    if (isEditing && editCharacter) {
      updateCharacter({
        id: editCharacter.id,
        updates: {
          name: trimmedName,
          description: description.trim(),
          styleDescription: trimmedStyleDesc,
        },
      })
      for (const image of pendingImages.values()) {
        addImage({ characterId: editCharacter.id, image })
      }
    } else {
      const characterId = addCharacter({
        name: trimmedName,
        description: description.trim(),
      })
      if (trimmedStyleDesc) {
        updateCharacter({
          id: characterId,
          updates: { styleDescription: trimmedStyleDesc },
        })
      }
      for (const image of pendingImages.values()) {
        addImage({ characterId, image })
      }
    }

    onOpenChange(false)
    resetForm()
  }, [
    name,
    description,
    styleDescription,
    isEditing,
    editCharacter,
    pendingImages,
    addCharacter,
    updateCharacter,
    addImage,
    onOpenChange,
    resetForm,
    t,
  ])

  const handleAnalyzeFromImage = useCallback(async () => {
    const firstImage = previewImages[0]
    if (!firstImage) {
      toast.error(t('ai.uploadReferenceFirst'))
      return
    }

    setIsAnalyzing(true)
    try {
      const blob = await getCharacterImageBlob({
        id: firstImage.blobKey,
      })
      if (!blob) {
        toast.error(t('characters.loadReferenceFailed'))
        return
      }

      const imageDataUrl = await blobToDataUrl({ blob })

      const [descResult, styleResult] = await Promise.all([
        analyzeImageWithVision({
          imageDataUrl,
          analysisPrompt: DESCRIPTION_ANALYSIS_PROMPT,
        }),
        analyzeImageWithVision({
          imageDataUrl,
          analysisPrompt: STYLE_ANALYSIS_PROMPT,
        }),
      ])

      if (descResult) setDescription(descResult)
      if (styleResult) setStyleDescription(styleResult)

      toast.success(t('characters.descriptionFromImage'))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('ai.analyzeFailed'),
      )
    } finally {
      setIsAnalyzing(false)
    }
  }, [previewImages, t])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t('characters.edit') : t('characters.create')}
            </DialogTitle>
          </DialogHeader>

          <div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="character-name">{t('common.name')}</Label>
              <Input
                id="character-name"
                placeholder={t('characters.name')}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="character-description">
                  {t('common.description')}
                </Label>
                {previewImages.length > 0 && isAgentConfigured && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-xs"
                    disabled={isAnalyzing}
                    onClick={handleAnalyzeFromImage}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void handleAnalyzeFromImage()
                    }}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    {t('characters.generateFromImage')}
                  </Button>
                )}
              </div>
              <Textarea
                id="character-description"
                placeholder={t('characters.appearancePrompt')}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
              />
              <p className="text-muted-foreground text-xs">
                {t('characters.autoInjected')}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="character-style-description">
                {t('characters.styleLock')}{' '}
                <span className="text-muted-foreground font-normal">
                  ({t('common.optional')})
                </span>
              </Label>
              <Textarea
                id="character-style-description"
                placeholder={t('ai.stylePlaceholder')}
                value={styleDescription}
                onChange={(event) => setStyleDescription(event.target.value)}
                rows={2}
              />
              <p className="text-muted-foreground text-xs">
                {t('characters.styleLockDesc')}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('ai.referenceImages')}</Label>
              <div className="flex flex-wrap gap-2">
                {previewImages.map((preview, index) => {
                  const allSources: ImageSource[] = previewImages.map((p) => ({
                    type: 'blob' as const,
                    blobKey: p.blobKey,
                    label: p.label,
                  }))
                  return (
                    <div
                      key={preview.id}
                      className="group/img relative size-20 overflow-hidden rounded-md border"
                    >
                      <button
                        type="button"
                        className="size-full cursor-pointer"
                        onClick={() =>
                          lightbox.open({
                            sources: allSources,
                            index,
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter')
                            lightbox.open({
                              sources: allSources,
                              index,
                            })
                        }}
                        title={t('characters.clickToView')}
                      >
                        {/* biome-ignore lint: data URL thumbnail */}
                        <img
                          src={preview.thumbnailDataUrl}
                          alt={preview.label}
                          className="size-full object-cover"
                        />
                      </button>
                      <button
                        type="button"
                        className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 opacity-0 transition-opacity hover:bg-black/80 group-hover/img:opacity-100"
                        onClick={() =>
                          handleRemovePreview({
                            imageId: preview.id,
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter')
                            handleRemovePreview({
                              imageId: preview.id,
                            })
                        }}
                      >
                        <X className="size-3 text-white" />
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    isGenerating || !isProviderConfigured || !description.trim()
                  }
                  onClick={handleGenerateTurnaround}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleGenerateTurnaround()
                  }}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-1 size-4 animate-spin" />
                      {t('common.generating')}
                    </>
                  ) : (
                    <>
                      <ImagePlus className="mr-1 size-4" />
                      {t('characters.generatePortrait')}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUploadImage}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleUploadImage()
                  }}
                >
                  <Upload className="mr-1 size-4" />
                  {t('common.upload')}
                </Button>
              </div>

              {!isProviderConfigured && (
                <p className="text-muted-foreground text-xs">
                  {t('characters.configureProvider')}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleOpenChange(false)
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSave()
              }}
              disabled={!name.trim()}
            >
              {isEditing ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ImageLightbox
        state={lightbox.state}
        onClose={lightbox.close}
        onPrev={lightbox.prev}
        onNext={lightbox.next}
      />
    </>
  )
}
