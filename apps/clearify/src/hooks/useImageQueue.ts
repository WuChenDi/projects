import { logger } from '@cdlab996/utils'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { decode, encode, getFileType } from '@/lib'
import type { CompressionOptions, ImageFile, OutputType } from '@/types'

export function useImageQueue(
  options: CompressionOptions,
  outputType: OutputType,
  setImages: React.Dispatch<React.SetStateAction<ImageFile[]>>,
) {
  const MAX_PARALLEL_PROCESSING = 3
  const [queue, setQueue] = useState<string[]>([])
  const processingCount = useRef(0)
  const processingImages = useRef(new Set<string>())
  const optionsRef = useRef(options)
  const outputTypeRef = useRef(outputType)

  // Keep refs in sync to avoid stale closures
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    outputTypeRef.current = outputType
  }, [outputType])

  const processImage = useCallback(
    async (image: ImageFile) => {
      if (processingImages.current.has(image.id)) {
        return
      }

      // Atomic guard: check count before incrementing
      if (processingCount.current >= MAX_PARALLEL_PROCESSING) {
        return
      }

      processingImages.current.add(image.id)
      processingCount.current++

      const currentOptions = optionsRef.current
      const currentOutputType = outputTypeRef.current

      try {
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? { ...img, status: 'processing' as const }
              : img,
          ),
        )

        const fileBuffer = await image.file.arrayBuffer()
        const sourceType = getFileType(image.file)

        if (!fileBuffer.byteLength) {
          throw new Error('Empty file')
        }

        const imageData = await decode(sourceType, fileBuffer)

        if (!imageData || !imageData.width || !imageData.height) {
          throw new Error('Invalid image data')
        }

        const compressedBuffer = await encode(
          currentOutputType,
          imageData,
          currentOptions,
        )

        if (!compressedBuffer.byteLength) {
          throw new Error('Failed to compress image')
        }

        const blob = new Blob([compressedBuffer], {
          type: `image/${currentOutputType}`,
        })
        const preview = URL.createObjectURL(blob)

        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  status: 'complete' as const,
                  preview,
                  blob,
                  compressedSize: compressedBuffer.byteLength,
                  outputType: currentOutputType,
                }
              : img,
          ),
        )
      } catch (error) {
        logger.error('Error processing image:', error)
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  status: 'error' as const,
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Failed to process image',
                }
              : img,
          ),
        )
      } finally {
        processingImages.current.delete(image.id)
        processingCount.current--
      }
    },
    [setImages],
  )

  const processNextInQueue = useCallback(() => {
    logger.log('Processing next in queue:', {
      queueLength: queue.length,
      processingCount: processingCount.current,
      processingImages: [...processingImages.current],
    })

    if (queue.length === 0) return

    setImages((prev) => {
      const availableSlots =
        MAX_PARALLEL_PROCESSING - processingCount.current
      if (availableSlots <= 0) return prev

      const imagesToProcess = prev
        .filter(
          (img) =>
            queue.includes(img.id) &&
            !processingImages.current.has(img.id),
        )
        .slice(0, availableSlots)

      logger.log('Found images to process:', imagesToProcess.length)

      if (imagesToProcess.length === 0) return prev

      const idsToProcess = imagesToProcess.map((img) => img.id)

      // Start processing these images
      for (const image of imagesToProcess) {
        void processImage(image).then(() => {
          // After each image completes, trigger next batch
          setQueue((q) => [...q])
        })
      }

      // Remove from queue
      setQueue((current) =>
        current.filter((id) => !idsToProcess.includes(id)),
      )

      return prev.map((img) =>
        idsToProcess.includes(img.id)
          ? { ...img, status: 'queued' as const }
          : img,
      )
    })
  }, [queue, processImage, setImages])

  // Start processing when queue changes
  useEffect(() => {
    logger.log('Queue changed:', queue.length)
    if (queue.length > 0) {
      processNextInQueue()
    }
  }, [queue, processNextInQueue])

  const addToQueue = useCallback((imageId: string) => {
    logger.log('Adding to queue:', imageId)
    setQueue((prev) => [...prev, imageId])
  }, [])

  return { addToQueue }
}
