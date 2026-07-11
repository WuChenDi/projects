import { createIDBStore } from '@cdlab/utils'
import type { EditorCore } from '@/editor/core'
import { mediaPool } from '@/editor/lib/media-pool'
import type { AudioTrack } from '@/editor/types'

// Timeline autosave. The full track array plus lightweight media descriptors
// are serialized to IndexedDB; the media *bytes* already live in `mediaPool`
// (written by MediaManager on add), so restore just re-links each clip's media
// back to its pooled blob. One project slot — this editor holds a single
// timeline at a time.

interface MediaDescriptor {
  id: string
  name: string
  duration: number
}

interface ProjectSnapshot {
  version: 1
  tracks: AudioTrack[]
  media: MediaDescriptor[]
}

const PROJECT_KEY = 'timeline'
const projectStore = createIDBStore<ProjectSnapshot>('bytts-editor-project')

export async function saveProject({
  editor,
}: {
  editor: EditorCore
}): Promise<void> {
  const tracks = editor.timeline.getTracks()
  const media: MediaDescriptor[] = editor.media.getAssets().map((asset) => ({
    id: asset.id,
    name: asset.name,
    duration: asset.duration,
  }))

  const snapshot: ProjectSnapshot = { version: 1, tracks, media }
  try {
    await projectStore.set(PROJECT_KEY, snapshot)
  } catch (error) {
    console.error('Failed to autosave timeline:', error)
  }
}

/**
 * Restores the saved timeline. Media descriptors are re-linked to their pooled
 * blobs; clips whose media blob is missing are dropped so playback never points
 * at a dead source. Returns true when a non-empty timeline was restored.
 */
export async function restoreProject({
  editor,
}: {
  editor: EditorCore
}): Promise<boolean> {
  let snapshot: ProjectSnapshot | null = null
  try {
    snapshot = await projectStore.get(PROJECT_KEY)
  } catch (error) {
    console.error('Failed to read autosaved timeline:', error)
    return false
  }

  if (!snapshot || snapshot.tracks.length === 0) return false

  const availableMediaIds = new Set<string>()
  for (const descriptor of snapshot.media) {
    try {
      const bytes = await mediaPool.get(descriptor.id)
      if (!bytes) continue
      const file = new File([bytes], `${descriptor.name}.mp3`, {
        type: 'audio/mpeg',
      })
      editor.media.hydrateAsset({
        id: descriptor.id,
        name: descriptor.name,
        file,
        duration: descriptor.duration,
      })
      availableMediaIds.add(descriptor.id)
    } catch (error) {
      console.error('Failed to restore media asset:', descriptor.id, error)
    }
  }

  // Normalize snapshots written before FEAT-028 (no fade/gain/solo fields).
  const tracks: AudioTrack[] = snapshot.tracks.map((track) => ({
    ...track,
    solo: track.solo ?? false,
    clips: track.clips
      .filter((clip) => availableMediaIds.has(clip.mediaId))
      .map((clip) => ({
        ...clip,
        fadeIn: clip.fadeIn ?? 0,
        fadeOut: clip.fadeOut ?? 0,
        gainDb: clip.gainDb ?? 0,
      })),
  }))

  editor.timeline.setTracks({ tracks })
  return tracks.some((track) => track.clips.length > 0) || tracks.length > 0
}

export async function clearProject(): Promise<void> {
  try {
    await projectStore.remove(PROJECT_KEY)
  } catch (error) {
    console.error('Failed to clear autosaved timeline:', error)
  }
}
