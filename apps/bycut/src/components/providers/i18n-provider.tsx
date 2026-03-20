'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { _setGlobalTranslation } from '@/lib/i18n'

export function I18nBridge({ children }: { children: React.ReactNode }) {
  const t = useTranslations()

  useEffect(() => {
    _setGlobalTranslation({
      t: (key: string, options?: Record<string, unknown>) =>
        t(key as never, options as never),
    })
  }, [t])

  return children
}
