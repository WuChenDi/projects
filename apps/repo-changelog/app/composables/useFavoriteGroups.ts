import { useStorage } from '@vueuse/core'

export interface FavoriteGroup {
  id: string
  name: string
  repos: string[]
  createdAt: number
}

export const useFavoriteGroups = () => {
  const groups = useStorage<FavoriteGroup[]>('repo-favorite-groups', [], undefined, {
    serializer: {
      read: (v: string) => {
        try {
          const parsed = JSON.parse(v)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      },
      write: (v: FavoriteGroup[]) => JSON.stringify(v)
    }
  })

  function genId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  }

  function addGroup(name: string, repos: string[]) {
    const trimmed = name.trim()
    if (!trimmed || repos.length === 0) return null
    const group: FavoriteGroup = {
      id: genId(),
      name: trimmed,
      repos: [...new Set(repos)],
      createdAt: Date.now()
    }
    groups.value = [group, ...groups.value]
    return group
  }

  function updateGroup(id: string, patch: Partial<Pick<FavoriteGroup, 'name' | 'repos'>>) {
    groups.value = groups.value.map(g =>
      g.id === id
        ? {
            ...g,
            ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
            ...(patch.repos !== undefined ? { repos: [...new Set(patch.repos)] } : {})
          }
        : g
    )
  }

  function removeGroup(id: string) {
    groups.value = groups.value.filter(g => g.id !== id)
  }

  return {
    groups,
    addGroup,
    updateGroup,
    removeGroup
  }
}
