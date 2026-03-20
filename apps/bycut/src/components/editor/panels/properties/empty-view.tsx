'use client'

import { Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function EmptyView() {
  const t = useTranslations()

  return (
    <div className="bg-background flex h-full flex-col items-center justify-center gap-3 p-4">
      <Settings className="text-muted-foreground/75 size-10" strokeWidth={1} />
      <div className="flex flex-col gap-2 text-center">
        <p className="text-lg font-medium ">{t('common.emptyHere')}</p>
        <p className="text-muted-foreground text-sm text-balance">
          {t('editor.clickToEdit')}
        </p>
      </div>
    </div>
  )
}
