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
import { Label } from '@cdlab996/ui/components/label'
import { PasswordInput } from '@cdlab996/ui/components/password-input'
import { Textarea } from '@cdlab996/ui/components/textarea'
import { cn } from '@cdlab996/ui/lib/utils'
import { FileText, Lock, Unlock, Upload } from 'lucide-react'
import type { RefObject } from 'react'
import type { FileInfo } from '@/types'
import { InputModeEnum, ModeEnum } from '@/types'
import { SCEncryptDecryptTabs } from './SCEncryptDecryptTabs'
import { SCFileInfoDisplay } from './SCFileInfoDisplay'

interface SCInputPanelProps {
  activeTab: ModeEnum
  onTabChange: (value: ModeEnum) => void
  inputMode: InputModeEnum
  onInputModeChange: (mode: InputModeEnum) => void
  password: string
  onPasswordChange: (value: string) => void
  fileInfo: FileInfo | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileSelect: (file: File | null) => void
  textInput: string
  onTextInputChange: (value: string) => void
  onProcess: () => void
  isProcessDisabled: boolean
}

export function SCInputPanel({
  activeTab,
  onTabChange,
  inputMode,
  onInputModeChange,
  password,
  onPasswordChange,
  fileInfo,
  fileInputRef,
  onFileSelect,
  textInput,
  onTextInputChange,
  onProcess,
  isProcessDisabled,
}: SCInputPanelProps) {
  const isEncrypt = activeTab === ModeEnum.ENCRYPT

  return (
    <Card className="shadow-none ">
      <CardHeader>
        <CardTitle>{isEncrypt ? 'Encrypt' : 'Decrypt'}</CardTitle>
        <CardDescription>
          {isEncrypt
            ? 'Encrypt your files or messages securely'
            : 'Decrypt your encrypted files or messages'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
        />
        <SCEncryptDecryptTabs activeTab={activeTab} onTabChange={onTabChange} />

        <div className="space-y-4">
          <Field>
            <Label>Input Mode</Label>
            <div className="flex gap-2">
              <Button
                variant={
                  inputMode === InputModeEnum.FILE ? 'default' : 'outline'
                }
                onClick={() => onInputModeChange(InputModeEnum.FILE)}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Upload className="size-4" />
                File
              </Button>
              <Button
                variant={
                  inputMode === InputModeEnum.MESSAGE ? 'default' : 'outline'
                }
                onClick={() => onInputModeChange(InputModeEnum.MESSAGE)}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <FileText className="size-4" />
                Messages
              </Button>
            </div>
          </Field>

          <Field>
            <Label>Password</Label>
            <PasswordInput
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Enter password"
            />
          </Field>

          <Field>
            {inputMode === InputModeEnum.FILE ? (
              <>
                <Label>Select File</Label>
                <div
                  className={cn(
                    'group relative overflow-hidden rounded-lg border border-dashed transition-all duration-300 cursor-pointer',
                    fileInfo
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
                >
                  <div className="flex flex-col items-center justify-center space-y-3 p-8">
                    <Upload
                      className={cn(
                        'size-8 transition-colors duration-300',
                        fileInfo
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
                        fileInfo
                          ? isEncrypt
                            ? 'text-blue-600'
                            : 'text-green-600'
                          : isEncrypt
                            ? 'text-gray-500 group-hover:text-blue-600'
                            : 'text-gray-500 group-hover:text-green-600',
                      )}
                    >
                      {fileInfo
                        ? `Selected: ${fileInfo.name}`
                        : 'Click to select a file'}
                    </span>
                  </div>
                </div>
                {fileInfo && <SCFileInfoDisplay fileInfo={fileInfo} />}
              </>
            ) : (
              <>
                <Label>Message</Label>
                <Textarea
                  value={textInput}
                  onChange={(e) => onTextInputChange(e.target.value)}
                  placeholder={
                    isEncrypt
                      ? 'Enter the message to be encrypted'
                      : 'Enter the message to be decrypted'
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
                  Encrypt
                </>
              ) : (
                <>
                  <Unlock />
                  Decrypt
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
