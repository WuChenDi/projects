// Public editor surface. TimelineEditor itself is intentionally NOT re-exported
// here — it is only reached through the dynamic import inside TimelineEditorLazy
// so it stays in its own lazily-loaded chunk.
export { TimelineEditorLazy } from '@/editor/components/timeline-editor-lazy'
export { useMaterialBridge } from '@/editor/lib/material-bridge'
