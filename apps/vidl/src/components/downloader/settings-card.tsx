'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@cdlab996/ui/components/dialog'
import { Field, FieldTitle } from '@cdlab996/ui/components/field'
import { Slider } from '@cdlab996/ui/components/slider'
import { RotateCcw, Settings2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { DownloadSettings } from '@/stores/settings-store'

interface SettingsDialogProps {
  settings: DownloadSettings
  defaultSettings: DownloadSettings
  disabled: boolean
  onSettingsChange: (next: Partial<DownloadSettings>) => void
  onReset: () => void
}

export function SettingsDialog({
  settings,
  defaultSettings,
  disabled,
  onSettingsChange,
  onReset,
}: SettingsDialogProps) {
  const t = useTranslations()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon-sm" disabled={disabled}>
          <Settings2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription>{t('settings.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Field>
            <div className="flex items-center justify-between">
              <FieldTitle>{t('settings.concurrency')}</FieldTitle>
              <span className="text-sm font-medium tabular-nums">
                {settings.concurrency}
              </span>
            </div>
            <Slider
              value={[settings.concurrency]}
              onValueChange={([v]) => onSettingsChange({ concurrency: v })}
              min={1}
              max={20}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.concurrencyHint')}
            </p>
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldTitle>{t('settings.timeout')}</FieldTitle>
              <span className="text-sm font-medium tabular-nums">
                {settings.timeoutMs / 1000}s
              </span>
            </div>
            <Slider
              value={[settings.timeoutMs / 1000]}
              onValueChange={([v]) =>
                onSettingsChange({ timeoutMs: v * 1000 })
              }
              min={5}
              max={120}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.timeoutHint')}
            </p>
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldTitle>{t('settings.maxRetries')}</FieldTitle>
              <span className="text-sm font-medium tabular-nums">
                {settings.maxRetries}
              </span>
            </div>
            <Slider
              value={[settings.maxRetries]}
              onValueChange={([v]) => onSettingsChange({ maxRetries: v })}
              min={0}
              max={10}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.maxRetriesHint')}
            </p>
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldTitle>{t('settings.retryDelay')}</FieldTitle>
              <span className="text-sm font-medium tabular-nums">
                {settings.retryBaseDelayMs / 1000}s
              </span>
            </div>
            <Slider
              value={[settings.retryBaseDelayMs / 1000]}
              onValueChange={([v]) =>
                onSettingsChange({ retryBaseDelayMs: v * 1000 })
              }
              min={0.5}
              max={10}
              step={0.5}
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.retryDelayHint')}
            </p>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="size-4" />
            {t('settings.reset')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
