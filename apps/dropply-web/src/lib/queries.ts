import { queryOptions } from '@tanstack/react-query'
import { PocketChestAPI } from '@/lib'

/**
 * Server config (`GET /api/config`) — shared by share, retrieve and email so
 * one action never fetches it twice. Callers on the hot path use
 * `queryClient.ensureQueryData(configQueryOptions)` to hit the cache.
 */
export const configQueryOptions = queryOptions({
  queryKey: ['dropply-config'],
  queryFn: () => new PocketChestAPI().getConfig(),
  staleTime: 60_000,
})
