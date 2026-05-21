import type { ImageProps } from './types'

const cache = new Map<string, string>()

export default async function getBase64ImageUrl(
  image: ImageProps,
): Promise<string | undefined> {
  const key = `${image.public_id}.${image.format}`
  const cached = cache.get(key)
  if (cached) {
    return cached
  }
  const response = await fetch(
    `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_jpg,w_8,q_70/${key}`,
  )
  if (!response.ok) {
    console.error(
      `[byshot] blur placeholder fetch failed: ${response.status} ${response.statusText} for ${key}`,
    )
    return undefined
  }
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] as number)
  }

  const url = `data:image/jpeg;base64,${btoa(binary)}`
  cache.set(key, url)
  return url
}
