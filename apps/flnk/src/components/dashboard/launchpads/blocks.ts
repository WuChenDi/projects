import type { LinkRef } from '@/components/launchpad/launchpad-view'
import type { LaunchpadBlock } from '@/database/schema'
import type { LinkRow } from '@/lib/api'

export type BlockType = LaunchpadBlock['type']

// Add-menu order — mirrors the MVP block set in the spec.
export const BLOCK_TYPES: BlockType[] = [
  'header',
  'socials',
  'button',
  'shortlink',
  'image',
  'text',
  'divider',
]

// Fresh block of `type` with sensible empty defaults and a unique id.
export function newBlock(type: BlockType): LaunchpadBlock {
  const id = crypto.randomUUID()
  switch (type) {
    case 'header':
      return { id, type, enabled: true }
    case 'socials':
      return { id, type, enabled: true, items: [] }
    case 'button':
      return {
        id,
        type,
        enabled: true,
        label: '',
        target: { kind: 'url', url: '' },
      }
    case 'shortlink':
      return { id, type, enabled: true, linkIds: [] }
    case 'image':
      return { id, type, enabled: true, src: '' }
    case 'text':
      return { id, type, enabled: true, text: '' }
    case 'divider':
      return { id, type, enabled: true }
  }
}

// Build the linkId → reference map the renderer needs from the loaded links.
export function buildLinkRefs(links: LinkRow[]): Record<string, LinkRef> {
  const refs: Record<string, LinkRef> = {}
  for (const link of links) {
    refs[link.id] = { slug: link.slug, label: link.title || link.slug }
  }
  return refs
}
