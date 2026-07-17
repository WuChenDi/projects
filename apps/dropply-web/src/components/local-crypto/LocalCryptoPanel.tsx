'use client'

import { Tabs, TabsList, TabsTrigger } from '@cdlab/ui/components/tabs'
import { FileText, KeyRound, Lock, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { useCryptoProcessor } from '@/hooks/useCryptoProcessor'
import { useKeysStore } from '@/store/useKeysStore'
import { InputModeEnum, ModeEnum } from '@/types/crypto'
import type { EncryptionMode } from '@/types/keys'
import { LocalInputPanel } from './LocalInputPanel'

interface LocalCryptoPanelProps {
  crypto: ReturnType<typeof useCryptoProcessor>
}

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
        <Tabs
          value={crypto.inputMode}
          onValueChange={(v) => crypto.setInputMode(v as InputModeEnum)}
        >
          <TabsList>
            <TabsTrigger value={InputModeEnum.FILE}>
              <Upload className="size-4" />
              {t('input.file')}
            </TabsTrigger>
            <TabsTrigger value={InputModeEnum.MESSAGE}>
              <FileText className="size-4" />
              {t('input.message')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Encrypt: choose the mode. Decrypt: it's auto-detected — no toggle. */}
        {isEncrypt && (
          <Tabs
            value={crypto.encryptionMode}
            onValueChange={(v) => crypto.setEncryptionMode(v as EncryptionMode)}
          >
            <TabsList>
              <TabsTrigger value="password">
                <Lock className="size-4" />
                {tk('modePassword')}
              </TabsTrigger>
              <TabsTrigger value="publickey">
                <KeyRound className="size-4" />
                {tk('modePublicKey')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
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
