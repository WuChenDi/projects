import { useTranslations } from 'next-intl'
import { DraggableItem } from '@/components/editor/panels/assets/draggable-item'
import { PanelBaseView as BaseView } from '@/components/editor/panels/panel-base-view'
import { DEFAULT_TEXT_ELEMENT } from '@/constants/text-constants'
import { useEditor } from '@/hooks/use-editor'
import { buildTextElement } from '@/lib/timeline/element-utils'

export function TextView() {
  const t = useTranslations()
  const editor = useEditor()

  const handleAddDefaultText = ({ currentTime }: { currentTime: number }) => {
    const activeScene = editor.scenes.getActiveScene()
    if (!activeScene) return

    const element = buildTextElement({
      raw: DEFAULT_TEXT_ELEMENT,
      startTime: currentTime,
    })

    editor.timeline.insertElement({
      element,
      placement: { mode: 'auto' },
    })
  }

  return (
    <BaseView>
      <div className="space-y-3">
        <DraggableItem
          name={t('properties.defaultText')}
          preview={
            <div className="bg-accent flex size-full items-center justify-center rounded">
              <span className="text-xs select-none">
                {t('properties.defaultText')}
              </span>
            </div>
          }
          dragData={{
            id: 'temp-text-id',
            type: DEFAULT_TEXT_ELEMENT.type,
            name: DEFAULT_TEXT_ELEMENT.name,
            content: DEFAULT_TEXT_ELEMENT.content,
          }}
          aspectRatio={1}
          onAddToTimeline={handleAddDefaultText}
          shouldShowLabel={false}
        />
      </div>
    </BaseView>
  )
}
