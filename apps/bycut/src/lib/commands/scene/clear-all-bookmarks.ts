import { EditorCore } from '@/core'
import { Command } from '@/lib/commands/base-command'
import { updateSceneInArray } from '@/lib/scenes'
import type { TScene } from '@/types/timeline'

export class ClearAllBookmarksCommand extends Command {
  private savedScenes: TScene[] | null = null

  execute(): void {
    const editor = EditorCore.getInstance()
    const activeScene = editor.scenes.getActiveScene()

    if (!activeScene || activeScene.bookmarks.length === 0) {
      return
    }

    const scenes = editor.scenes.getScenes()
    this.savedScenes = [...scenes]

    const updatedScenes = updateSceneInArray({
      scenes,
      sceneId: activeScene.id,
      updates: { bookmarks: [] },
    })

    editor.scenes.setScenes({ scenes: updatedScenes })
  }

  undo(): void {
    if (this.savedScenes) {
      const editor = EditorCore.getInstance()
      editor.scenes.setScenes({ scenes: this.savedScenes })
    }
  }
}
