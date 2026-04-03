'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Card, CardContent, CardHeader } from '@cdlab996/ui/components/card'
import { Field, FieldDescription } from '@cdlab996/ui/components/field'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@cdlab996/ui/components/input-group'
import { Label } from '@cdlab996/ui/components/label'
import { Loader2, RefreshCw, ShieldCheck, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ExpirySelector } from '@/components/ExpirySelector'
import { FileUpload } from '@/components/FileUpload'
import { TabSwitcher } from '@/components/TabSwitcher'
import { TextInput } from '@/components/TextInput'
import { generateEncryptionKey } from '@/lib'
import type { TextItem, ValidityDays } from '@/types'

interface ShareFormProps {
  files: File[]
  textItems: TextItem[]
  validityDays: ValidityDays
  encryptionKey: string
  isUploading: boolean
  locked?: boolean
  maxFileSize?: number
  onUnlock?: () => void
  onFilesChange: (files: File[]) => void
  onTextItemsChange: (items: TextItem[]) => void
  onValidityDaysChange: (days: ValidityDays) => void
  onEncryptionKeyChange: (key: string) => void
  onUpload: () => void
}

export function ShareForm({
  files,
  textItems,
  validityDays,
  encryptionKey,
  isUploading,
  locked,
  maxFileSize,
  onUnlock,
  onFilesChange,
  onTextItemsChange,
  onValidityDaysChange,
  onEncryptionKeyChange,
  onUpload,
}: ShareFormProps) {
  const t = useTranslations('share')

  return (
    <Card className="relative shadow-none overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-3">
          <TabSwitcher />
        </div>
      </CardHeader>
      {locked && (
        <div
          className="absolute inset-0 top-[60px] z-10 cursor-pointer bg-background/60 backdrop-blur-[2px] flex items-center justify-center"
          onClick={onUnlock}
        >
          <div className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-primary-foreground shadow-lg text-sm font-medium">
            <ShieldCheck className="size-4" />
            {t('unlockWithTOTP')}
          </div>
        </div>
      )}
      <CardContent className="space-y-6">
        <Field>
          <Label>{t('text')}</Label>
          <TextInput
            textItems={textItems}
            onTextItemsChange={onTextItemsChange}
          />
        </Field>

        <Field>
          <Label>{t('files')}</Label>
          <FileUpload
            files={files}
            onFilesChange={onFilesChange}
            maxFileSize={maxFileSize}
          />
        </Field>

        <ExpirySelector value={validityDays} onChange={onValidityDaysChange} />

        <Field>
          <Label>{t('encryptionKey')}</Label>
          <InputGroup>
            <InputGroupInput
              value={encryptionKey}
              onChange={(e) => onEncryptionKeyChange(e.target.value)}
              placeholder={t('encryptionKeyPlaceholder')}
              className="font-mono text-xs"
            />
            <InputGroupButton
              onClick={() => onEncryptionKeyChange(generateEncryptionKey())}
              title={t('generateNewKey')}
            >
              <RefreshCw className="size-4" />
            </InputGroupButton>
          </InputGroup>
          <FieldDescription>{t('encryptionKeyDescription')}</FieldDescription>
        </Field>

        <Button
          onClick={onUpload}
          disabled={
            isUploading || (files.length === 0 && textItems.length === 0)
          }
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t('uploading')}
            </>
          ) : (
            <>
              <Upload className="size-4" />
              {t('uploadAndGenerate')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
