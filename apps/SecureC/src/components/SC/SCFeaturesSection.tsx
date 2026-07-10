import { Card } from '@cdlab/ui/components/card'
import { Separator } from '@cdlab/ui/components/separator'
import { cn } from '@cdlab/ui/lib/utils'
import { ChevronDown, Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export function SCFeaturesSection() {
  const [showFeatures, setShowFeatures] = useState(true)
  const t = useTranslations('features')

  const features = [t('aesEncrypt'), t('argon2id'), t('chunked'), t('download')]

  return (
    <Card className="p-0 ">
      <div
        className="w-full flex items-center justify-between p-4 rounded-lg"
        onClick={() => setShowFeatures(!showFeatures)}
      >
        <div className="flex items-center gap-2.5">
          <Info className="size-4 text-primary" />
          <span className="text-base font-medium text-gray-800 dark:text-gray-200">
            {t('title')}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'size-4 text-gray-500 dark:text-gray-400 transition-transform duration-200',
            showFeatures && 'rotate-180',
          )}
        />
      </div>

      {showFeatures && (
        <div className="px-4 pb-4 space-y-3">
          {features.map((feature, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders don't need stable keys
            <div key={index} className="flex items-start gap-3">
              <div className="size-1.5 rounded-full bg-primary dark:bg-primary mt-2 shrink-0" />
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature}
              </p>
            </div>
          ))}
          <Separator />
          <p className="text-muted-foreground text-xs text-center">
            {t('localNote')}
          </p>
        </div>
      )}
    </Card>
  )
}
