import { EditorCore } from '@/core'
import { Command } from '@/lib/commands/base-command'
import { updateSceneInArray } from '@/lib/scenes'
import { getFrameTime, removeBookmarkFromArray } from '@/lib/timeline/bookmarks'
import type { TScene } from '@/types/timeline'

export class MoveBookmarkCommand extends Command {
  private savedScenes: TScene[] | null = null

  constructor(
    private fromTime: number,
    private toTime: number,
  ) {
    super()
  }

  execute(): void {
    const editor = EditorCore.getInstance()
    const activeScene = editor.scenes.getActiveScene()
    const activeProject = editor.project.getActive()

    if (!activeScene || !activeProject) {
      return
    }

    const scenes = editor.scenes.getScenes()
    this.savedScenes = [...scenes]

    const fps = activeProject.settings.fps
    const fromFrameTime = getFrameTime({ time: this.fromTime, fps })
    const toFrameTime = getFrameTime({ time: this.toTime, fps })

    const withoutOld = removeBookmarkFromArray({
      bookmarks: activeScene.bookmarks,
      frameTime: fromFrameTime,
    })

    const updatedBookmarks = [...withoutOld, toFrameTime].sort((a, b) => a - b)

    const updatedScenes = updateSceneInArray({
      scenes,
      sceneId: activeScene.id,
      updates: { bookmarks: updatedBookmarks },
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
