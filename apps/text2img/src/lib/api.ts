import type { ModelGroup } from '@/types'

export async function fetchModels(): Promise<ModelGroup[]> {
  const response = await fetch('/api/models')
  if (!response.ok) {
    throw new Error('Failed to fetch models')
  }
  return response.json()
}

export async function fetchPrompts(): Promise<string[]> {
  const response = await fetch('/api/prompts')
  if (!response.ok) {
    throw new Error('Failed to fetch prompts')
  }
  return response.json()
}
