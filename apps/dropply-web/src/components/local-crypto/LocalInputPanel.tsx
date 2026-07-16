import { Button } from '@cdlab/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab/ui/components/card'
import { Field } from '@cdlab/ui/components/field'
import { Input } from '@cdlab/ui/components/input'
import { Label } from '@cdlab/ui/components/label'
import { PasswordInput } from '@cdlab/ui/components/password-input'
import { Textarea } from '@cdlab/ui/components/textarea'
import { cn } from '@cdlab/ui/lib/utils'
import { formatFileSize } from '@cdlab/utils'
import { FileText, Lock, Unlock, Upload, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { RefObject } from 'react'
import type { FileInfo } from '@/types/crypto'
import { InputModeEnum, ModeEnum } from '@/types/crypto'

interface LocalInputPanelProps {
  mode: ModeEnum
  inputMode: InputModeEnum
  onInputModeChange: (mode: InputModeEnum) => void
  password: string
  onPasswordChange: (value: string) => void
  fileInfos: FileInfo[]
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileSelect: (files: File[]) => void
  onRemoveFile: (index: number) => void
  textInput: string
  onTextInputChange: (value: string) => void
  onProcess: () => void
  isProcessDisabled: boolean
}

export function LocalInputPanel({
  mode,
  inputMode,
  onInputModeChange,
  password,
  onPasswordChange,
  fileInfos,
  fileInputRef,
  onFileSelect,
  onRemoveFile,
  textInput,
  onTextInputChange,
  onProcess,
  isProcessDisabled,
}: LocalInputPanelProps) {
  const t = useTranslations('localCrypto')
  const isEncrypt = mode === ModeEnum.ENCRYPT
  const hasFiles = fileInfos.length > 0

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>
          {isEncrypt ? t('input.encryptTitle') : t('input.decryptTitle')}
        </CardTitle>
        <CardDescription>
          {isEncrypt
            ? t('input.encryptDescription')
            : t('input.decryptDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={(e) => {
            const files = e.target.files
            if (files && files.length > 0) {
              onFileSelect(Array.from(files))
            }
            e.target.value = ''
          }}
        />

        <div className="space-y-4">
          <Field>
            <Label>{t('input.inputMode')}</Label>
            <div className="flex gap-2">
              <Button
                variant={
                  inputMode === InputModeEnum.FILE ? 'default' : 'outline'
                }
                onClick={() => onInputModeChange(InputModeEnum.FILE)}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Upload className="size-4" />
                {t('input.file')}
              </Button>
              <Button
                variant={
                  inputMode === InputModeEnum.MESSAGE ? 'default' : 'outline'
                }
                onClick={() => onInputModeChange(InputModeEnum.MESSAGE)}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <FileText className="size-4" />
                {t('input.message')}
              </Button>
            </div>
          </Field>

          <Field>
            <Label>{t('input.password')}</Label>
            <PasswordInput
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder={t('input.passwordPlaceholder')}
            />
          </Field>

          <Field>
            {inputMode === InputModeEnum.FILE ? (
              <>
                <Label>{t('input.selectFile')}</Label>
                <div
                  className={cn(
                    'group relative overflow-hidden rounded-lg border border-dashed transition-all duration-300 cursor-pointer',
                    hasFiles
                      ? isEncrypt
                        ? 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/30'
                        : 'border-green-400 dark:border-green-500 bg-green-50/50 dark:bg-green-900/30'
                      : cn(
                          'border-gray-300 dark:border-gray-600',
                          isEncrypt
                            ? 'hover:border-blue-400 dark:hover:border-blue-500'
                            : 'hover:border-green-400 dark:hover:border-green-500',
                        ),
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const files = e.dataTransfer.files
                    if (files.length > 0) {
                      onFileSelect(Array.from(files))
                    }
                  }}
                >
                  <div className="flex flex-col items-center justify-center space-y-3 p-8">
                    <Upload
                      className={cn(
                        'size-8 transition-colors duration-300',
                        hasFiles
                          ? isEncrypt
                            ? 'text-blue-500'
                            : 'text-green-500'
                          : isEncrypt
                            ? 'text-gray-400 group-hover:text-blue-500'
                            : 'text-gray-400 group-hover:text-green-500',
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm text-center font-medium transition-colors duration-300',
                        hasFiles
                          ? isEncrypt
                            ? 'text-blue-600'
                            : 'text-green-600'
                          : isEncrypt
                            ? 'text-gray-500 group-hover:text-blue-600'
                            : 'text-gray-500 group-hover:text-green-600',
                      )}
                    >
                      {hasFiles
                        ? fileInfos.length === 1
                          ? fileInfos[0].name
                          : `${fileInfos.length} files selected`
                        : t('input.clickToSelect')}
                    </span>
                  </div>
                </div>

                {hasFiles && (
                  <div className="mt-2 space-y-1.5">
                    {fileInfos.map((info, index) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: file list order is stable during display
                        key={index}
                        className="flex items-center justify-between rounded-md bg-gray-50/50 dark:bg-gray-800/30 px-3 py-2 text-xs border border-gray-200/50 dark:border-gray-700/50"
                      >
                        <span className="truncate flex-1 text-gray-700 dark:text-gray-300 font-medium">
                          {info.name}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-3 shrink-0">
                          {formatFileSize(info.size)}
                        </span>
                        <button
                          type="button"
                          className="ml-2 shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            onRemoveFile(index)
                          }}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <Label>{t('input.message')}</Label>
                <Textarea
                  value={textInput}
                  onChange={(e) => onTextInputChange(e.target.value)}
                  placeholder={
                    isEncrypt
                      ? t('input.messagePlaceholderEncrypt')
                      : t('input.messagePlaceholderDecrypt')
                  }
                  className="min-h-37 max-h-75 text-sm"
                />
              </>
            )}
          </Field>

          <div className="flex">
            <Button
              variant="default"
              disabled={isProcessDisabled}
              onClick={onProcess}
              className={cn(
                'flex-1',
                isEncrypt
                  ? 'bg-primary hover:bg-primary/90'
                  : 'bg-green-600 hover:bg-green-700',
              )}
            >
              {isEncrypt ? (
                <>
                  <Lock />
                  {t('input.encrypt')}
                </>
              ) : (
                <>
                  <Unlock />
                  {t('input.decrypt')}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
