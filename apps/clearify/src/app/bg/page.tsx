'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { logger } from '@cdlab996/utils'
import { Trash2 } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { PageContainer } from '@/components/layout'
import { LeftPanel, RightPanel } from '@/components/pages/bg'
import { genid } from '@/lib'
import { getModelInfo, initializeModel, processImages } from '@/lib/process'
import type { BgError, BgImageFile, ModelStatus, RemovalModel } from '@/types'

export default function BG() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<BgError | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [currentModel, setCurrentModel] =
    useState<RemovalModel>('wuchendi/MODNet')
  const [isModelSwitching, setIsModelSwitching] = useState(false)
  const [images, setImages] = useState<BgImageFile[]>([])
  const [modelStatus, setModelStatus] = useState<ModelStatus>('unavailable')
  const [isModelInitialized, setIsModelInitialized] = useState(false)

  useEffect(() => {
    // Only check device capabilities, don't initialize model
    const { isIOS: isIOSDevice } = getModelInfo()
    setIsIOS(isIOSDevice)
  }, [])

  // Initialize model on first use
  const ensureModelInitialized = useCallback(async () => {
    if (isModelInitialized) {
      return true
    }

    setIsLoading(true)
    setModelStatus('loading')
    setError(null)

    try {
      const initialized = await initializeModel('wuchendi/MODNet')
      if (!initialized) {
        throw new Error('Failed to initialize MODNet model')
      }
      setCurrentModel('wuchendi/MODNet')
      setModelStatus('ready')
      setIsModelInitialized(true)
      toast.success('MODNet model loaded successfully')
      return true
    } catch (err) {
      // Fallback to RMBG-2.0, then RMBG-1.4 if needed
      try {
        const fallbackInitialized = await initializeModel('briaai/RMBG-2.0')
        if (!fallbackInitialized) {
          throw new Error('Failed to initialize RMBG-2.0 model')
        }
        setCurrentModel('briaai/RMBG-2.0')
        setModelStatus('ready')
        setIsModelInitialized(true)
        toast.success('RMBG-2.0 model loaded successfully')
        return true
      } catch (fallbackErr) {
        try {
          const finalFallbackInitialized =
            await initializeModel('briaai/RMBG-1.4')
          if (!finalFallbackInitialized) {
            throw new Error('Failed to initialize RMBG-1.4 model')
          }
          setCurrentModel('briaai/RMBG-1.4')
          setModelStatus('ready')
          setIsModelInitialized(true)
          toast.info('Using RMBG-1.4 model')
          return true
        } catch (finalErr) {
          setError({
            message:
              finalErr instanceof Error
                ? finalErr.message
                : 'Failed to load any model',
          })
          setModelStatus('unavailable')
          toast.error(
            `Model loading failed: ${finalErr instanceof Error ? finalErr.message : 'Unknown error'}`,
          )
          return false
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [isModelInitialized])

  // Create a properly typed handler for model changes
  const handleModelChange = async (value: RemovalModel) => {
    setIsModelSwitching(true)
    setModelStatus('loading')
    setError(null)
    try {
      const initialized = await initializeModel(value)
      if (!initialized) {
        throw new Error('Failed to initialize new model')
      }
      setCurrentModel(value)
      setModelStatus('ready')
      setIsModelInitialized(true)
      toast.success(`Model changed to ${value}`)
    } catch (err) {
      if (err instanceof Error && err.message.includes('Falling back')) {
        setCurrentModel('briaai/RMBG-1.4')
        setModelStatus('unavailable')
        setError({ message: 'MODNet not supported, switched to RMBG-1.4' })
        toast.info('MODNet not supported, switched to RMBG-1.4')
      } else {
        setError({
          message:
            err instanceof Error ? err.message : 'Failed to switch models',
        })
        setModelStatus('unavailable')
        toast.error(
          `Model switch failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        )
      }
    } finally {
      setIsModelSwitching(false)
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Initialize model on first use
      const initialized = await ensureModelInitialized()
      if (!initialized) {
        toast.error('Failed to initialize model. Please try again.')
        return
      }

      const newImages: BgImageFile[] = acceptedFiles.map((file) => ({
        id: String(genid.nextId()),
        file,
        status: 'pending' as const,
        originalSize: file.size,
        preview: URL.createObjectURL(file),
      }))
      setImages((prev) => [...prev, ...newImages])
      toast.info(`Processing ${acceptedFiles.length} image(s)...`)

      for (const image of newImages) {
        try {
          // Update status to processing
          setImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? { ...img, status: 'processing' as const }
                : img,
            ),
          )

          const result = await processImages([image.file])
          if (result && result.length > 0) {
            const processedBlob = result[0]
            const processedUrl = URL.createObjectURL(processedBlob!)

            setImages((prev) =>
              prev.map((img) =>
                img.id === image.id
                  ? {
                      ...img,
                      status: 'complete' as const,
                      processedBlob,
                      processedUrl,
                    }
                  : img,
              ),
            )
            toast.success('Image processed successfully')
          }
        } catch (error) {
          logger.error('Error processing image:', error)
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'

          setImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? { ...img, status: 'error' as const, error: errorMessage }
                : img,
            ),
          )
          toast.error(`Processing failed: ${errorMessage}`)
        }
      }
    },
    [ensureModelInitialized],
  )

  const handlePaste = async (event: React.ClipboardEvent) => {
    const clipboardItems = event.clipboardData.items
    const imageFiles: File[] = []
    for (const item of clipboardItems) {
      if (item.type.startsWith('image')) {
        const file = item.getAsFile()
        if (file) {
          imageFiles.push(file)
        }
      }
    }
    if (imageFiles.length > 0) {
      await onDrop(imageFiles)
    }
  }

  const handleSampleImageClick = useCallback(
    async (url: string) => {
      try {
        // Initialize model on first use
        const initialized = await ensureModelInitialized()
        if (!initialized) {
          toast.error('Failed to initialize model. Please try again.')
          return
        }

        toast.info('Loading sample image...')
        logger.log('Fetching URL:', url)
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          headers: {
            Accept: 'image/jpeg, image/png',
          },
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const blob = await response.blob()
        logger.log('Blob received, size:', blob.size)
        if (!blob.type.startsWith('image/')) {
          throw new Error('Fetched content is not an image')
        }
        const file = new File([blob], 'sample-image.jpg', { type: blob.type })
        logger.log('File created:', file)
        await onDrop([file])
      } catch (error) {
        logger.error('Error loading sample image:', error)
        toast.error(
          `Failed to load sample image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    },
    [ensureModelInitialized, onDrop],
  )

  const handleClearAllImages = () => {
    // Clean up object URLs
    images.forEach((image) => {
      if (image.preview) URL.revokeObjectURL(image.preview)
      if (image.processedUrl) URL.revokeObjectURL(image.processedUrl)
    })
    setImages([])
    toast.success('All images cleared')
  }

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
  })

  const getErrorActions = () => {
    if (
      currentModel === 'wuchendi/MODNet' &&
      error?.message.includes('MODNet not supported')
    ) {
      return (
        <Button
          onClick={(e) => {
            e.stopPropagation()
            void handleModelChange('briaai/RMBG-2.0')
          }}
          size="sm"
        >
          Switch to RMBG-2.0
        </Button>
      )
    }
    if (
      (currentModel === 'briaai/RMBG-2.0' ||
        currentModel === 'wuchendi/MODNet') &&
      error?.message.includes('not supported')
    ) {
      return (
        <Button
          onClick={(e) => {
            e.stopPropagation()
            void handleModelChange('briaai/RMBG-1.4')
          }}
          size="sm"
        >
          Switch to RMBG-1.4
        </Button>
      )
    }
    return null
  }

  const handleDeleteImage = useCallback(
    (id: string) => {
      const image = images.find((img) => img.id === id)
      if (image) {
        if (image.preview) URL.revokeObjectURL(image.preview)
        if (image.processedUrl) URL.revokeObjectURL(image.processedUrl)
      }
      setImages((prev) => prev.filter((img) => img.id !== id))
    },
    [images],
  )

  return (
    <PageContainer scrollable={false}>
      <div onPaste={handlePaste} className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
          {/* Left Panel - Controls */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Background Remover</CardTitle>
              <CardDescription>
                Remove backgrounds from images using AI models, completely free
                and without uploading.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeftPanel
                currentModel={currentModel}
                modelStatus={modelStatus}
                isModelInitialized={isModelInitialized}
                isModelSwitching={isModelSwitching}
                isIOS={isIOS}
                isLoading={isLoading}
                error={error}
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                isDragActive={isDragActive}
                isDragAccept={isDragAccept}
                isDragReject={isDragReject}
                errorActions={getErrorActions()}
                onModelChange={handleModelChange}
                onSampleImageClick={handleSampleImageClick}
              />
            </CardContent>
          </Card>

          {/* Right Panel - Images */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Images ({images.length})</CardTitle>
              <CardAction>
                {images.length > 0 && (
                  <Button
                    onClick={handleClearAllImages}
                    size="sm"
                    variant="secondary"
                  >
                    <Trash2 className="size-4" />
                    Clear All
                  </Button>
                )}
              </CardAction>
            </CardHeader>
            <CardContent>
              <RightPanel images={images} onDelete={handleDeleteImage} />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
