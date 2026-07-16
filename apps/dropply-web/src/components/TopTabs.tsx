import { TabsList, TabsTrigger } from '@cdlab/ui/components/tabs'
import { Download, Lock, LockOpen, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'

/**
 * Top-level 4-tab switcher for the merged UX shell: Encrypt / Decrypt / Share / Retrieve.
 * Share/Retrieve labels reuse the existing `tabs` i18n namespace; Encrypt/Decrypt use
 * temporary literals until FEAT-062 wires their full i18n keys.
 */
export function TopTabs() {
  const t = useTranslations('tabs')

  return (
    <TabsList className="w-full">
      <TabsTrigger value="encrypt" className="flex-1 gap-1.5">
        <Lock className="size-4" />
        Encrypt
      </TabsTrigger>
      <TabsTrigger value="decrypt" className="flex-1 gap-1.5">
        <LockOpen className="size-4" />
        Decrypt
      </TabsTrigger>
      <TabsTrigger value="share" className="flex-1 gap-1.5">
        <Upload className="size-4" />
        {t('share')}
      </TabsTrigger>
      <TabsTrigger value="retrieve" className="flex-1 gap-1.5">
        <Download className="size-4" />
        {t('retrieve')}
      </TabsTrigger>
    </TabsList>
  )
}
