// Barrel re-exporting the previous public surface of `@/lib/links`, which was a
// single module before being split by concern into cache/resolve/repo/tags.
export { linkCacheKey, purgeLink } from '@/lib/links/cache'
export type {
  ImportReport,
  LinkStatus,
  ListOptions,
  RepoResult,
  SortKey,
} from '@/lib/links/repo'
export {
  countLinks,
  createLink,
  deleteLink,
  getLinkById,
  getLinkRowsByIds,
  importLinks,
  listCreators,
  listLinks,
  searchLinks,
  updateLink,
  upsertLink,
} from '@/lib/links/repo'
export {
  disableLinkOnVisitCap,
  isExpired,
  normalizeSlug,
  resolveLink,
  visitLimitReached,
} from '@/lib/links/resolve'
export { bulkTagLinks, listTags, setLinkTags } from '@/lib/links/tags'
