'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import type { TAction } from '@/lib/actions'
import { ACTIONS } from '@/lib/actions'
import { useKeybindingsStore } from '@/stores/keybindings-store'
import {
  getPlatformAlternateKey,
  getPlatformSpecialKey,
} from '@/utils/platform'

export interface KeyboardShortcut {
  id: string
  keys: string[]
  description: string
  category: string
  action: TAction
  icon?: React.ReactNode
}

const TRANSLATABLE_KEYS = [
  'space',
  'home',
  'end',
  'enter',
  'delete',
  'backspace',
] as const

function formatKey({
  key,
  t,
}: {
  key: string
  t: (key: string) => string
}): string {
  let formatted = key
    .replace('ctrl', getPlatformSpecialKey())
    .replace('alt', getPlatformAlternateKey())
    .replace('shift', 'Shift')
    .replace('left', '←')
    .replace('right', '→')
    .replace('up', '↑')
    .replace('down', '↓')

  for (const tk of TRANSLATABLE_KEYS) {
    formatted = formatted.replace(tk, t(`shortcuts.keys.${tk}`))
  }

  return formatted.replace('-', '+')
}

export function useKeyboardShortcutsHelp() {
  const { keybindings } = useKeybindingsStore()
  const t = useTranslations()

  const shortcuts = useMemo(() => {
    const result: KeyboardShortcut[] = []
    const actionToKeys: Record<string, string[]> = {}

    for (const [key, action] of Object.entries(keybindings)) {
      if (action) {
        if (!actionToKeys[action]) {
          actionToKeys[action] = []
        }
        actionToKeys[action].push(formatKey({ key, t }))
      }
    }

    for (const [actionId, keys] of Object.entries(actionToKeys)) {
      if (!isAction(actionId)) continue

      const actionDef = ACTIONS[actionId]
      result.push({
        id: actionId,
        keys,
        description: t(`shortcuts.actions.${actionId}`),
        category: actionDef.category,
        action: actionId,
      })
    }

    return result.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      return a.description.localeCompare(b.description)
    })
  }, [keybindings, t])

  return {
    shortcuts,
  }
}

function isAction(id: string): id is TAction {
  return id in ACTIONS
}
