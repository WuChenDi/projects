import {
  Brain,
  Captions,
  ChevronsRight,
  FolderOpen,
  Headphones,
  Palette,
  Settings,
  SlidersHorizontal,
  Smile,
  Type,
  Wand2,
} from 'lucide-react'
import type { ElementType } from 'react'
import { create } from 'zustand'

export const TAB_KEYS = [
  'media',
  'sounds',
  'text',
  'stickers',
  'effects',
  'transitions',
  'captions',
  'filters',
  'adjustment',
  'ai',
  'settings',
] as const

export type Tab = (typeof TAB_KEYS)[number]

const createLucideIcon =
  ({ Icon }: { Icon: ElementType<{ className?: string }> }) =>
  ({ className }: { className?: string }) => <Icon className={className} />

const TAB_LABELS: Record<Tab, string> = {
  media: 'assets.media',
  sounds: 'sounds.title',
  text: 'common.text',
  stickers: 'assets.stickers',
  effects: 'assets.effects',
  transitions: 'assets.transitions',
  captions: 'assets.captions',
  filters: 'assets.filters',
  adjustment: 'properties.adjustment',
  ai: 'misc.ai',
  settings: 'common.settings',
}

export const tabs = {
  media: {
    icon: createLucideIcon({ Icon: FolderOpen }),
    label: TAB_LABELS.media,
  },
  sounds: {
    icon: createLucideIcon({ Icon: Headphones }),
    label: TAB_LABELS.sounds,
  },
  text: {
    icon: createLucideIcon({ Icon: Type }),
    label: TAB_LABELS.text,
  },
  stickers: {
    icon: createLucideIcon({ Icon: Smile }),
    label: TAB_LABELS.stickers,
  },
  effects: {
    icon: createLucideIcon({ Icon: Wand2 }),
    label: TAB_LABELS.effects,
  },
  transitions: {
    icon: createLucideIcon({ Icon: ChevronsRight }),
    label: TAB_LABELS.transitions,
  },
  captions: {
    icon: createLucideIcon({ Icon: Captions }),
    label: TAB_LABELS.captions,
  },
  filters: {
    icon: createLucideIcon({ Icon: Palette }),
    label: TAB_LABELS.filters,
  },
  adjustment: {
    icon: createLucideIcon({ Icon: SlidersHorizontal }),
    label: TAB_LABELS.adjustment,
  },
  ai: {
    icon: createLucideIcon({ Icon: Brain }),
    label: TAB_LABELS.ai,
  },
  settings: {
    icon: createLucideIcon({ Icon: Settings }),
    label: TAB_LABELS.settings,
  },
} satisfies Record<
  Tab,
  { icon: ElementType<{ className?: string }>; label: string }
>

type MediaViewMode = 'grid' | 'list'

interface AssetsPanelStore {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  highlightMediaId: string | null
  requestRevealMedia: (mediaId: string) => void
  clearHighlight: () => void

  /* Media */
  mediaViewMode: MediaViewMode
  setMediaViewMode: (mode: MediaViewMode) => void
}

export const useAssetsPanelStore = create<AssetsPanelStore>((set) => ({
  activeTab: 'media',
  setActiveTab: (tab) => set({ activeTab: tab }),
  highlightMediaId: null,
  requestRevealMedia: (mediaId) =>
    set({ activeTab: 'media', highlightMediaId: mediaId }),
  clearHighlight: () => set({ highlightMediaId: null }),
  mediaViewMode: 'grid',
  setMediaViewMode: (mode) => set({ mediaViewMode: mode }),
}))
