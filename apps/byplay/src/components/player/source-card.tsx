'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Field } from '@cdlab996/ui/components/field'
import { Input } from '@cdlab996/ui/components/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cdlab996/ui/components/tooltip'
import { HardDriveDownload } from 'lucide-react'
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
        <Field orientation="vertical">
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder={t('placeholder')}
              onKeyDown={(e) => e.key === 'Enter' && onLoad()}
              className="flex-1"
            />
            <Button onClick={onLoad} disabled={isLoading || !url.trim()}>
              {isLoading ? t('loading') : t('load')}
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!url.trim()}
                    asChild={!!url.trim()}
                  >
                    {url.trim() ? (
                      <a
                        href={`${VIDL_URL}/${locale}?url=${encodeURIComponent(url.trim())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <HardDriveDownload className="size-4" />
                      </a>
                    ) : (
                      <span>
                        <HardDriveDownload className="size-4" />
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('downloadVideo')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </Field>
      </CardContent>
    </Card>
  )
}
