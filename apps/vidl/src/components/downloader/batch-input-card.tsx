'use client'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from '@cdlab996/ui/components/input-group'
import { ClipboardPaste, CornerDownLeft, Link, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'

interface BatchInputCardProps {
  headerAction?: React.ReactNode
  batchText: string
  onBatchTextChange: (text: string) => void
  disabled: boolean
  onAddToQueue: () => void
}

export function BatchInputCard({
  headerAction,
  batchText,
  onBatchTextChange,
  disabled,
  onAddToQueue,
}: BatchInputCardProps) {
  const t = useTranslations()

  const lineCount = useMemo(
    () => batchText.split('\n').filter((l) => l.trim()).length,
    [batchText],
  )

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) return
      onBatchTextChange(batchText ? `${batchText}\n${text}` : text)
    } catch {
      toast.error(t('batch.clipboardError'))
    }
  }, [batchText, onBatchTextChange, t])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (!disabled && batchText.trim()) onAddToQueue()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tool.title')}</CardTitle>
        <CardDescription>{t('tool.description')}</CardDescription>
        {headerAction && <CardAction>{headerAction}</CardAction>}
      </CardHeader>
      <CardContent className="space-y-4">
        <InputGroup>
          <InputGroupAddon align="block-start" className="border-b">
            <InputGroupText className="font-mono font-medium">
              <Link className="size-4" />
              {t('batch.inputLabel')}
            </InputGroupText>
            <div className="flex items-center gap-0.5 ml-auto">
              <InputGroupButton
                size="icon-xs"
                onClick={() => void handlePaste()}
                disabled={disabled}
              >
                <ClipboardPaste />
              </InputGroupButton>
              <InputGroupButton
                size="icon-xs"
                onClick={() => onBatchTextChange('')}
              >
                <Trash2 />
              </InputGroupButton>
            </div>
          </InputGroupAddon>
          <InputGroupTextarea
            value={batchText}
            onChange={(e) => onBatchTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={t('batch.inputPlaceholder')}
            className="min-h-24 max-h-48 font-mono text-xs overflow-y-auto"
          />
          <InputGroupAddon align="block-end" className="border-t">
            <InputGroupText>
              {lineCount > 0 ? t('batch.lineCount', { count: lineCount }) : ''}
            </InputGroupText>
            <InputGroupButton
              size="sm"
              className="ml-auto"
              variant="default"
              onClick={onAddToQueue}
              disabled={disabled || !batchText.trim()}
            >
              {t('batch.addToQueue')}
              <CornerDownLeft />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </CardContent>
    </Card>
  )
}
