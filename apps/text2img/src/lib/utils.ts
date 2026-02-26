import type { ModelGroup } from '@/types'

export function findModelById(modelGroups: ModelGroup[], modelId: string) {
  for (const group of modelGroups) {
    const model = group.models.find((m) => m.id === modelId)
    if (model) return model
  }
  return null
}
