import type { ResourceApiResponse } from 'cloudinary'
import { Suspense } from 'react'
import Gallery from '@/components/Gallery'
import getResults from '@/utils/cachedImages'
import getBase64ImageUrl from '@/utils/generateBlurPlaceholder'
import type { ImageProps } from '@/utils/types'

// Limit how many blur placeholders we fetch per SSR.
// Cloudflare Workers caps outgoing subrequests (50 free / 1000 paid),
// and only the first viewport's photos benefit visually from blur.
const BLUR_PLACEHOLDER_COUNT = 30

export default async function HomePage() {
  const results: ResourceApiResponse = await getResults()

  const reducedResults: ImageProps[] = results.resources.map((result, i) => ({
    id: i,
    asset_id: result.asset_id,
    height: result.height,
    width: result.width,
    public_id: result.public_id,
    format: result.format,
  }))

  const blurTargets = reducedResults.slice(0, BLUR_PLACEHOLDER_COUNT)
  const blurDataUrls = await Promise.all(
    blurTargets.map((image) => getBase64ImageUrl(image)),
  )
  for (let j = 0; j < blurTargets.length; j++) {
    const target = blurTargets[j]
    if (target) {
      target.blurDataUrl = blurDataUrls[j]
    }
  }

  return (
    <Suspense fallback={null}>
      <Gallery images={reducedResults} />
    </Suspense>
  )
}
