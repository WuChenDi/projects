import { getRandomValues } from '@cdlab996/uncrypto'
import { sha256 } from '@noble/hashes/sha2.js'
import { CONFIG } from './constants'
import { InvalidDataError } from './errors'
import type { ChunkMetadata } from './types'

export function secureClear(buffer: ArrayBufferLike): void {
  const view = new Uint8Array(buffer)
  getRandomValues(view)
  view.fill(0)
}

export function getMemoryUsage(): number {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize
  }
  return 0
}

export function waitForMemory(
  threshold: number = CONFIG.CHUNK.MAX_MEMORY,
): Promise<void> {
  return new Promise((resolve) => {
    const checkMemory = () => {
      if (getMemoryUsage() < threshold) {
        resolve()
      } else {
        if ('gc' in globalThis) {
          ;(globalThis as any).gc()
        }
        setTimeout(checkMemory, 100)
      }
    }
    checkMemory()
  })
}

export function serializeMetadata(metadata: ChunkMetadata): Uint8Array {
  const sizeBytes = new Uint8Array(4)
  new DataView(sizeBytes.buffer).setUint32(0, metadata.size, true)

  return new Uint8Array([...sizeBytes, ...metadata.hash])
}

export function deserializeMetadata(bytes: Uint8Array): ChunkMetadata {
  const view = new DataView(bytes.buffer, bytes.byteOffset)
  return {
    size: view.getUint32(0, true),
    hash: bytes.slice(4, 36),
  }
}

export async function readFileChunk(
  file: File,
  start: number,
  end: number,
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const blob = file.slice(start, end)
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read file chunk'))
    reader.readAsArrayBuffer(blob)
  })
}

export async function readAndExtractChunk(file: File, offset: number) {
  try {
    const metadataBuffer = await readFileChunk(file, offset, offset + 36)
    const metadataBytes = new Uint8Array(metadataBuffer)
    const metadata = deserializeMetadata(metadataBytes)

    const totalChunkSize = 36 + metadata.size
    const fullBuffer = await readFileChunk(
      file,
      offset,
      offset + totalChunkSize,
    )
    const fullData = new Uint8Array(fullBuffer)

    return {
      data: fullData.slice(36),
      totalSize: totalChunkSize,
      metadata,
    }
  } catch (error) {
    throw new InvalidDataError(
      `Failed to read chunk: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

export async function hashFile(file: File): Promise<Uint8Array> {
  const chunkSize = 1024 * 1024 * 10
  const hasher = sha256.create()

  try {
    for (let i = 0; i < file.size; i += chunkSize) {
      const chunk = await readFileChunk(
        file,
        i,
        Math.min(i + chunkSize, file.size),
      )
      hasher.update(new Uint8Array(chunk))
      await waitForMemory()
    }

    return hasher.digest()
  } catch (error) {
    throw new InvalidDataError(
      `Failed to hash file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}
