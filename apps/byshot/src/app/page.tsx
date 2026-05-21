import type { ResourceApiResponse } from 'cloudinary'
import { Suspense } from 'react'
import Gallery from '@/components/Gallery'
import getResults from '@/utils/cachedImages'
import getBase64ImageUrl from '@/utils/generateBlurPlaceholder'
import type { ImageProps } from '@/utils/types'

export default async function HomePage() {
  const results: ResourceApiResponse = await getResults()

  const reducedResults: ImageProps[] = []
  let i = 0
  for (const result of results.resources) {
    reducedResults.push({
      id: i,
      height: result.height,
      width: result.width,
      public_id: result.public_id,
      format: result.format,
    })
    i++
  }

  const blurImagePromises = reducedResults.map((image) =>
    getBase64ImageUrl(image),
  )
  const imagesWithBlurDataUrls = await Promise.all(blurImagePromises)

  for (let j = 0; j < reducedResults.length; j++) {
    reducedResults[j].blurDataUrl = imagesWithBlurDataUrls[j]
  }

  return (
    <Suspense fallback={null}>
      <Gallery images={reducedResults} />
    </Suspense>
  )
}
