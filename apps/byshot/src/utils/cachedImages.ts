import type { ResourceApiResponse } from 'cloudinary'
import cloudinary from './cloudinary'

let cachedResults: ResourceApiResponse | null = null

export default async function getResults() {
  if (!cachedResults) {
    const fetchedResults = (await cloudinary.v2.search
      .expression(`folder:${process.env.CLOUDINARY_FOLDER}/*`)
      .sort_by('public_id', 'desc')
      .max_results(400)
      .execute()) as ResourceApiResponse

    cachedResults = fetchedResults
  }

  return cachedResults
}
