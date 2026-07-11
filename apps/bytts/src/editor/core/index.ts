import { AudioManager } from '@/editor/core/audio-manager'
import { CommandManager } from '@/editor/core/commands'
import { MediaManager } from '@/editor/core/media-manager'
import { PlaybackManager } from '@/editor/core/playback-manager'
import { SelectionManager } from '@/editor/core/selection-manager'
import { TimelineManager } from '@/editor/core/timeline-manager'

// Audio-only editor core. Wires the manager subset FEAT-026 needs; scenes /
// renderer / project / save managers from bycut are intentionally dropped
// (persistence lands as thin IndexedDB autosave in FEAT-027).

export class EditorCore {
  private static instance: EditorCore | null = null

  public readonly command: CommandManager
  public readonly timeline: TimelineManager
  public readonly media: MediaManager
  public readonly selection: SelectionManager
  public readonly playback: PlaybackManager
  public readonly audio: AudioManager

  private constructor() {
    this.command = new CommandManager()
    this.timeline = new TimelineManager()
    this.media = new MediaManager()
    this.selection = new SelectionManager()
    this.playback = new PlaybackManager(this)
    this.audio = new AudioManager(this)
  }

  static getInstance(): EditorCore {
    if (!EditorCore.instance) {
      EditorCore.instance = new EditorCore()
    }
    return EditorCore.instance
  }

  static reset(): void {
    EditorCore.instance?.audio.dispose()
    EditorCore.instance = null
  }
}
