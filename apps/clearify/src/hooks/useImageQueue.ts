import { logger } from '@cdlab996/utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import { decode, encode, getFileType } from '@/lib'
import { useSquishStore } from '@/store/useSquishStore'
import type { CompressionOptions, ImageFile, OutputType } from '@/types'

export function useImageQueue(
  options: CompressionOptions,
  outputType: OutputType,
) {
  const MAX_PARALLEL_PROCESSING = 3
  const [queue, setQueue] = useState<string[]>([])
  const processingCount = useRef(0)
  const processingImages = useRef(new Set<string>())
  const optionsRef = useRef(options)
  const outputTypeRef = useRef(outputType)
  const updateImage = useSquishStore((s) => s.updateImage)

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

      if (processingCount.current >= MAX_PARALLEL_PROCESSING) {
        return
      }

      processingImages.current.add(image.id)
      processingCount.current++

      const currentOptions = optionsRef.current
      const currentOutputType = outputTypeRef.current

      try {
        await updateImage(image.id, { status: 'processing' })

        if (!image.file) {
          throw new Error('Source file unavailable')
        }
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

        await updateImage(image.id, {
          status: 'complete',
          preview,
          blob,
          compressedSize: compressedBuffer.byteLength,
          outputType: currentOutputType,
        })
      } catch (error) {
        logger.error('Error processing image:', error)
        await updateImage(image.id, {
          status: 'error',
          error:
            error instanceof Error ? error.message : 'Failed to process image',
        })
      } finally {
        processingImages.current.delete(image.id)
        processingCount.current--
      }
    },
    [updateImage],
  )

  const processNextInQueue = useCallback(() => {
    logger.log('Processing next in queue:', {
      queueLength: queue.length,
      processingCount: processingCount.current,
      processingImages: [...processingImages.current],
    })

    if (queue.length === 0) return

    const availableSlots = MAX_PARALLEL_PROCESSING - processingCount.current
    if (availableSlots <= 0) return

    const currentImages = useSquishStore.getState().images
    const imagesToProcess = currentImages
      .filter(
        (img) =>
          queue.includes(img.id) && !processingImages.current.has(img.id),
      )
      .slice(0, availableSlots)

    logger.log('Found images to process:', imagesToProcess.length)
    if (imagesToProcess.length === 0) return

    const idsToProcess = imagesToProcess.map((img) => img.id)

    for (const image of imagesToProcess) {
      void updateImage(image.id, { status: 'queued' })
      void processImage(image).then(() => {
        setQueue((q) => [...q])
      })
    }

    setQueue((current) => current.filter((id) => !idsToProcess.includes(id)))
  }, [queue, processImage, updateImage])

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
