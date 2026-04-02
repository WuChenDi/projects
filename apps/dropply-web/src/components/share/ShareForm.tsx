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
  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-center gap-3">
          <TabSwitcher />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Field>
          <Label>Text</Label>
          <TextInput
            textItems={textItems}
            onTextItemsChange={onTextItemsChange}
          />
        </Field>

        <Field>
          <Label>Files</Label>
          <FileUpload files={files} onFilesChange={onFilesChange} />
        </Field>

        <ExpirySelector
          value={validityDays}
          onChange={onValidityDaysChange}
        />

        <Field>
          <Label>Encryption Key</Label>
          <InputGroup>
            <InputGroupInput
              value={encryptionKey}
              onChange={(e) => onEncryptionKeyChange(e.target.value)}
              placeholder="Enter or auto-generate"
              className="font-mono text-xs"
            />
            <InputGroupButton
              onClick={() => onEncryptionKeyChange(generateEncryptionKey())}
              title="Generate new key"
            >
              <RefreshCw className="size-4" />
            </InputGroupButton>
          </InputGroup>
          <FieldDescription>
            Auto-generated. You can customize it or regenerate.
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
              Uploading...
            </>
          ) : (
            <>
              <Upload className="size-4" />
              Upload & Generate Code
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
