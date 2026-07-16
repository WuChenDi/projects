'use client'

import { cn } from '@cdlab/ui/lib/utils'
import { FileText, KeyRound, Lock, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { useCryptoProcessor } from '@/hooks/useCryptoProcessor'
import { useKeysStore } from '@/store/useKeysStore'
import { InputModeEnum, ModeEnum } from '@/types/crypto'
import { LocalInputPanel } from './LocalInputPanel'

interface LocalCryptoPanelProps {
  crypto: ReturnType<typeof useCryptoProcessor>
}

const segItem =
  'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors'

/**
 * The single local encrypt/decrypt tool. Encrypt vs decrypt is derived from the
 * input; the key manager and retrieve live in the app header.
 */
export function LocalCryptoPanel({ crypto }: LocalCryptoPanelProps) {
  const t = useTranslations('localCrypto')
  const tk = useTranslations('keys')
  const mode = crypto.activeTab
  const isEncrypt = mode === ModeEnum.ENCRYPT
  const publicKeys = useKeysStore((s) => s.publicKeys)
  const keyPairs = useKeysStore((s) => s.keyPairs)

  // Encrypt picks a recipient public key; decrypt picks one of your own keys.
  const savedKeys = isEncrypt ? publicKeys : keyPairs

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
        <div className="inline-flex rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => crypto.setInputMode(InputModeEnum.FILE)}
            className={cn(
              segItem,
              crypto.inputMode === InputModeEnum.FILE
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Upload className="size-4" />
            {t('input.file')}
          </button>
          <button
            type="button"
            onClick={() => crypto.setInputMode(InputModeEnum.MESSAGE)}
            className={cn(
              segItem,
              crypto.inputMode === InputModeEnum.MESSAGE
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <FileText className="size-4" />
            {t('input.message')}
          </button>
        </div>

        {/* Encrypt: choose the mode. Decrypt: it's auto-detected — no toggle. */}
        {isEncrypt && (
          <div className="inline-flex rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => crypto.setEncryptionMode('password')}
              className={cn(
                segItem,
                crypto.encryptionMode === 'password'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Lock className="size-4" />
              {tk('modePassword')}
            </button>
            <button
              type="button"
              onClick={() => crypto.setEncryptionMode('publickey')}
              className={cn(
                segItem,
                crypto.encryptionMode === 'publickey'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <KeyRound className="size-4" />
              {tk('modePublicKey')}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <LocalInputPanel
          mode={mode}
          inputMode={crypto.inputMode}
          password={crypto.password}
          onPasswordChange={crypto.setPassword}
          fileInfos={crypto.fileInfos}
          fileInputRef={crypto.fileInputRef}
          onFileSelect={crypto.handleFileSelect}
          onRemoveFile={crypto.removeFile}
          textInput={crypto.textInput}
          onTextInputChange={crypto.setTextInput}
          onProcess={crypto.processInput}
          isProcessDisabled={crypto.isProcessDisabled}
          encryptionMode={crypto.encryptionMode}
          keyInput={crypto.keyInput}
          onKeyInputChange={crypto.setKeyInput}
          savedKeys={savedKeys}
        />
      </div>
    </>
  )
}
