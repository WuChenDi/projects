import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { decode, encode, getFileType } from '@/lib'
import { logger } from '@/lib/logger'
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const processImage = useCallback(
    async (image: ImageFile) => {
      if (processingImages.current.has(image.id)) {
        return // Skip if already processing this image
      }
      processingImages.current.add(image.id)
      processingCount.current++

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

        // Decode the image
        const imageData = await decode(sourceType, fileBuffer)

        if (!imageData || !imageData.width || !imageData.height) {
          throw new Error('Invalid image data')
        }

        // Encode to the target format
        const compressedBuffer = await encode(outputType, imageData, options)

        if (!compressedBuffer.byteLength) {
          throw new Error('Failed to compress image')
        }

        const blob = new Blob([compressedBuffer], {
          type: `image/${outputType}`,
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
                  outputType,
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
        // Try to process next images if any
        setTimeout(processNextInQueue, 0)
      }
    },
    [options, outputType, setImages],
  )

  const processNextInQueue = useCallback(() => {
    logger.log('Processing next in queue:', {
      queueLength: queue.length,
      processingCount: processingCount.current,
      processingImages: [...processingImages.current],
    })

    if (queue.length === 0) return

    // Get all images we can process in this batch
    setImages((prev) => {
      const imagesToProcess = prev.filter(
        (img) =>
          queue.includes(img.id) &&
          !processingImages.current.has(img.id) &&
          processingCount.current < MAX_PARALLEL_PROCESSING,
      )

      logger.log('Found images to process:', imagesToProcess.length)

      if (imagesToProcess.length === 0) return prev

      // Start processing these images
      imagesToProcess.forEach((image, index) => {
        setTimeout(() => {
          void processImage(image)
        }, index * 100)
      })

      // Remove these from queue
      setQueue((current) =>
        current.filter((id) => !imagesToProcess.some((img) => img.id === id)),
      )

      // Update status to queued
      return prev.map((img) =>
        imagesToProcess.some((processImg) => processImg.id === img.id)
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
