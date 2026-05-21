import type { ResourceApiResponse } from 'cloudinary'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Carousel from '@/components/Carousel'
import getResults from '@/utils/cachedImages'
import cloudinary from '@/utils/cloudinary'
import getBase64ImageUrl from '@/utils/generateBlurPlaceholder'
import type { ImageProps } from '@/utils/types'

type PageProps = { params: Promise<{ photoId: string }> }

async function loadPhoto(
  assetId: string,
): Promise<{ photo: ImageProps; index: number } | null> {
  const results: ResourceApiResponse = await getResults()

  let index = -1
  let match: ResourceApiResponse['resources'][number] | undefined
  for (let i = 0; i < results.resources.length; i++) {
    if (results.resources[i]?.asset_id === assetId) {
      index = i
      match = results.resources[i]
      break
    }
  }
  if (!match || index < 0) return null

  const photo: ImageProps = {
    id: index,
    asset_id: match.asset_id,
    height: match.height,
    width: match.width,
    public_id: match.public_id,
    format: match.format,
  }
  photo.blurDataUrl = await getBase64ImageUrl(photo)
  return { photo, index }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { photoId } = await params
  const loaded = await loadPhoto(photoId)
  if (!loaded) return {}

  const currentPhotoUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_scale,w_2560/${loaded.photo.public_id}.${loaded.photo.format}`

  return {
    title: `Photo ${loaded.index + 1} | byshot`,
    openGraph: { images: [currentPhotoUrl] },
    twitter: { images: [currentPhotoUrl] },
  }
}

export async function generateStaticParams() {
  const results = (await cloudinary.v2.search
    .expression(`folder:${process.env.CLOUDINARY_FOLDER}/*`)
    .sort_by('public_id', 'desc')
    .max_results(400)
    .execute()) as ResourceApiResponse

  return results.resources.map((r) => ({ photoId: r.asset_id }))
}

export const dynamicParams = false

export default async function PhotoPage({ params }: PageProps) {
  const { photoId } = await params
  const loaded = await loadPhoto(photoId)
  if (!loaded) notFound()

  return (
    <main className="mx-auto max-w-[1960px] p-4">
      <Carousel currentPhoto={loaded.photo} index={loaded.index} />
    </main>
  )
}
