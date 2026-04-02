'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@cdlab996/ui/components/card'
import { Field, FieldDescription } from '@cdlab996/ui/components/field'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@cdlab996/ui/components/input-group'
import { Label } from '@cdlab996/ui/components/label'
import { Loader2, RefreshCw, Upload } from 'lucide-react'
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
  onFilesChange,
  onTextItemsChange,
  onValidityDaysChange,
  onEncryptionKeyChange,
  onUpload,
}: ShareFormProps) {
  const t = useTranslations('share')

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-center gap-3">
          <TabSwitcher />
        </div>
      </CardHeader>
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
          <FileUpload files={files} onFilesChange={onFilesChange} />
        </Field>

        <ExpirySelector
          value={validityDays}
          onChange={onValidityDaysChange}
        />

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
          <FieldDescription>
            {t('encryptionKeyDescription')}
          </FieldDescription>
        </Field>

        <Button
          onClick={onUpload}
          disabled={isUploading || (files.length === 0 && textItems.length === 0)}
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
