'use client'

import { Button } from '@cdlab/ui/components/button'
import { Card, CardContent } from '@cdlab/ui/components/card'
import { Field, FieldDescription } from '@cdlab/ui/components/field'
import { Input } from '@cdlab/ui/components/input'
import { Label } from '@cdlab/ui/components/label'
import { CheckCircle, Download, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface RetrieveFormProps {
  retrievalCode: string
  encryptionKey: string | null
  isRetrieving: boolean
  alreadyRetrieved: boolean
  onRetrievalCodeChange: (code: string) => void
  onEncryptionKeyChange: (key: string | null) => void
  onRetrieve: () => void
}

export function RetrieveForm({
  retrievalCode,
  encryptionKey,
  isRetrieving,
  alreadyRetrieved,
  onRetrievalCodeChange,
  onEncryptionKeyChange,
  onRetrieve,
}: RetrieveFormProps) {
  const t = useTranslations('retrieve')
  const canSubmit =
    !isRetrieving &&
    retrievalCode.trim().length === 6 &&
    !!encryptionKey &&
    !alreadyRetrieved

  return (
    <Card className="border-none bg-transparent shadow-none pt-0">
      <CardContent className="space-y-5 px-0">
        <Field>
          <Label htmlFor="retrieval-code">{t('retrievalCode')}</Label>
          <Input
            id="retrieval-code"
            type="text"
            value={retrievalCode}
            onChange={(e) =>
              onRetrievalCodeChange(e.target.value.toUpperCase())
            }
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && onRetrieve()}
            placeholder={t('retrievalCodePlaceholder')}
            maxLength={6}
          />
        </Field>

        <Field>
          <Label htmlFor="encryption-key">{t('encryptionKey')}</Label>
          <Input
            id="encryption-key"
            type="text"
            value={encryptionKey || ''}
            onChange={(e) => onEncryptionKeyChange(e.target.value || null)}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && onRetrieve()}
            placeholder={t('encryptionKeyPlaceholder')}
          />
          <FieldDescription>
            {encryptionKey ? t('keyDetected') : t('pasteKeyHint')}
          </FieldDescription>
        </Field>

        <Button onClick={onRetrieve} disabled={!canSubmit} className="w-full">
          {isRetrieving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t('retrieving')}
            </>
          ) : alreadyRetrieved ? (
            <>
              <CheckCircle className="size-4" />
              {t('alreadyRetrieved')}
            </>
          ) : (
            <>
              <Download className="size-4" />
              {t('accessFiles')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
