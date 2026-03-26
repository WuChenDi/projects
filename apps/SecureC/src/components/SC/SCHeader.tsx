'use client'

import GradientText from '@cdlab996/ui/reactbits/GradientText'
import ShinyText from '@cdlab996/ui/reactbits/ShinyText'
import { useTranslations } from 'next-intl'

export function SCHeader() {
  const t = useTranslations('seo')

  return (
    <div className="text-center space-y-3 mb-8">
      <GradientText className="text-4xl md:text-5xl font-bold bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent flex items-center justify-center gap-3">
        SecureC
      </GradientText>
      <ShinyText
        text={t('subtitle')}
        disabled={false}
        speed={3}
        className="text-sm text-gray-600 dark:text-gray-400 font-medium"
      />
    </div>
  )
}
