'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Input } from '@cdlab996/ui/components/input'
import { useLocale, useTranslations } from 'next-intl'

const VIDL_URL = 'https://vidl.pages.dev'

interface SourceCardProps {
  url: string
  isLoading: boolean
  onUrlChange: (url: string) => void
  onLoad: () => void
}

export function SourceCard({
  url,
  isLoading,
  onUrlChange,
  onLoad,
}: SourceCardProps) {
  const t = useTranslations('source')
  const locale = useLocale()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={t('placeholder')}
          onKeyDown={(e) => e.key === 'Enter' && onLoad()}
          className="flex-1"
        />
      </CardContent>
      <CardFooter>
        <div className="flex flex-row gap-2 w-full">
          <Button
            onClick={onLoad}
            disabled={isLoading || !url.trim()}
            className="flex-1"
          >
            {isLoading ? t('loading') : t('load')}
          </Button>
          <Button
            variant="outline"
            disabled={!url.trim()}
            asChild={!!url.trim()}
            className="flex-1"
          >
            {url.trim() ? (
              <a
                href={`${VIDL_URL}/${locale}?url=${encodeURIComponent(url.trim())}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('downloadVideo')}
              </a>
            ) : (
              t('downloadVideo')
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
