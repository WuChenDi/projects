'use client'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import JSZip from 'jszip'
import type React from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { PageContainer } from '@/components/layout'
import {
  ActionButtons,
  ImageComparisonModal,
  LeftPanel,
  RightPanel,
} from '@/components/pages/squish'
import { useImageQueue } from '@/hooks/useImageQueue'
import { DEFAULT_QUALITY_SETTINGS, downloadImage, genid, logger } from '@/lib'
import type {
  CompressionOptions as CompressionOptionsType,
  ImageFile,
  OutputType,
} from '@/types'

export default function Squish() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [outputType, setOutputType] = useState<OutputType>('webp')
  const [options, setOptions] = useState<CompressionOptionsType>({
    quality: DEFAULT_QUALITY_SETTINGS.webp,
  })
  const [isDownloading, setIsDownloading] = useState(false)
  const [isZipping, setIsZipping] = useState(false)
  const [compareImage, setCompareImage] = useState<ImageFile | null>(null)

  const { addToQueue } = useImageQueue(options, outputType, setImages)

  // Handle output format change
  const handleOutputTypeChange = useCallback((type: OutputType) => {
    setOutputType(type)
    if (type !== 'png') {
      setOptions({ quality: DEFAULT_QUALITY_SETTINGS[type] })
    }
  }, [])

  // Handle file drop or selection
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newImages = acceptedFiles
        .filter(
          (file) =>
            file.type.startsWith('image/') ||
            file.name.toLowerCase().endsWith('.jxl'),
        )
        .map((file) => ({
          id: String(genid.nextId()),
          file,
          status: 'pending' as const,
          originalSize: file.size,
          preview: URL.createObjectURL(file),
        }))
      setImages((prev) => [...prev, ...newImages])
      toast.info(`Processing ${acceptedFiles.length} image(s)...`)
      requestAnimationFrame(() => {
        newImages.forEach((image) => addToQueue(image.id))
      })
    },
    [addToQueue],
  )

  // Handle paste event for images
  const handlePaste = useCallback(
    async (event: React.ClipboardEvent) => {
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
        onDrop(imageFiles)
      }
    },
    [onDrop],
  )

  // Handle sample image click
  const handleSampleImageClick = useCallback(
    async (url: string) => {
      try {
        toast.info('Loading sample image...')
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          headers: { Accept: 'image/jpeg, image/png' },
        })
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`)
        const blob = await response.blob()
        if (!blob.type.startsWith('image/'))
          throw new Error('Fetched content is not an image')
        const file = new File([blob], 'sample-image.jpg', { type: blob.type })
        onDrop([file])
      } catch (error) {
        toast.error(
          `Failed to load sample image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    },
    [onDrop],
  )

  // Handle removing a single image
  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === id)
      if (image?.preview) URL.revokeObjectURL(image.preview)
      return prev.filter((img) => img.id !== id)
    })
  }, [])

  // Handle retrying a failed image
  const handleRetryImage = useCallback(
    (id: string) => {
      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? { ...img, status: 'pending' as const, error: undefined }
            : img,
        ),
      )
      addToQueue(id)
      toast.info('Retrying image processing...')
    },
    [addToQueue],
  )

  // Handle clearing all images
  const handleClearAll = useCallback(() => {
    images.forEach((image) => {
      if (image.preview) URL.revokeObjectURL(image.preview)
    })
    setImages([])
    toast.success('All images cleared')
  }, [images])

  // Handle comparing images
  const handleCompareImage = (image: ImageFile) => {
    console.log('Comparing image:', image)
    setCompareImage(image)
  }

  // Handle downloading all completed images
  const handleDownloadAll = useCallback(async () => {
    setIsDownloading(true)
    try {
      const completedImages = images.filter((img) => img.status === 'complete')
      for (const image of completedImages) {
        if (image.blob && image.outputType) {
          await downloadImage(image)
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }
      toast.success(`Downloaded ${completedImages.length} image(s)`)
    } catch (error) {
      logger.error(
        `Error downloading images: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { images },
      )
      toast.error('Failed to download images')
    } finally {
      setIsDownloading(false)
    }
  }, [images])

  // Handle downloading all completed images as a ZIP
  const handleDownloadZip = useCallback(async () => {
    setIsZipping(true)
    try {
      const zip = new JSZip()
      const completedImages = images.filter((img) => img.status === 'complete')

      for (const image of completedImages) {
        if (image.blob && image.outputType) {
          const fileName = `${image.file.name.split('.')[0]}.${image.outputType}`
          zip.file(fileName, image.blob)
        }
      }

      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = 'squish-images.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`Downloaded ${completedImages.length} image(s) as ZIP`)
    } catch (error) {
      logger.error(
        `Error creating ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { images },
      )
      toast.error('Failed to create ZIP file')
    } finally {
      setIsZipping(false)
    }
  }, [images])

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
      'image/avif': ['.avif'],
      'image/jxl': ['.jxl'],
    },
  })

  const completedImages = useMemo(
    () => images.filter((img) => img.status === 'complete').length,
    [images],
  )

  return (
    <PageContainer scrollable={false}>
      <div onPaste={handlePaste} className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Squish</CardTitle>
              <CardDescription>
                Compress images up to 90% while maintaining high quality,
                completely free and without uploading.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeftPanel
                outputType={outputType}
                options={options}
                onOutputTypeChange={handleOutputTypeChange}
                onQualityChange={(value) => setOptions({ quality: value })}
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                isDragActive={isDragActive}
                isDragAccept={isDragAccept}
                isDragReject={isDragReject}
                hasImages={images.length > 0}
                onSampleImageClick={handleSampleImageClick}
              />
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Images ({images.length})</CardTitle>
              <CardAction>
                <ActionButtons
                  completedImages={completedImages}
                  totalImages={images.length}
                  handleDownloadAll={handleDownloadAll}
                  handleDownloadZip={handleDownloadZip}
                  handleClearAll={handleClearAll}
                  isDownloading={isDownloading}
                  isZipping={isZipping}
                />
              </CardAction>
            </CardHeader>
            <CardContent>
              <RightPanel
                images={images}
                handleRemoveImage={handleRemoveImage}
                handleRetryImage={handleRetryImage}
                handleCompareImage={handleCompareImage}
              />
            </CardContent>
          </Card>
        </div>

        {compareImage && (
          <ImageComparisonModal
            image={compareImage}
            isOpen={!!compareImage}
            onClose={() => setCompareImage(null)}
          />
        )}
      </div>
    </PageContainer>
  )
}
