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
import { useTranslations } from 'next-intl'

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
          </div>
        </Field>
      </CardContent>
    </Card>
  )
}
