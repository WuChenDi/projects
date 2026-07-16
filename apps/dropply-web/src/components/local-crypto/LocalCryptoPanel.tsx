'use client'

import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { useCryptoProcessor } from '@/hooks/useCryptoProcessor'
import type { ModeEnum } from '@/types/crypto'
import { LocalFeaturesSection } from './LocalFeaturesSection'
import { LocalInputPanel } from './LocalInputPanel'
import { LocalResultsPanel } from './LocalResultsPanel'

interface LocalCryptoPanelProps {
  /** Shared engine hook lifted to the page so state survives Encrypt↔Decrypt switches. */
  crypto: ReturnType<typeof useCryptoProcessor>
  /** Which top-level tab this panel renders — fixes the encrypt/decrypt flow. */
  mode: ModeEnum
}

/**
 * Local (client-side) encrypt/decrypt panel. The encrypt vs decrypt selection is
 * driven by the top-level Dropply tab (`mode`), so the ported inner encrypt/decrypt
 * switcher is intentionally not rendered here.
 */
export function LocalCryptoPanel({ crypto, mode }: LocalCryptoPanelProps) {
  const t = useTranslations('localCrypto')

  const handleClearAll = () => {
    crypto.processResults.forEach((result) => crypto.removeResult(result.id))
    toast.success(t('toast.allCleared'))
  }

  return (
    <div className="w-full h-full grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
      <div className="space-y-4">
        <LocalInputPanel
          mode={mode}
          inputMode={crypto.inputMode}
          onInputModeChange={crypto.setInputMode}
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
        />
        <LocalFeaturesSection />
      </div>

      <LocalResultsPanel
        results={crypto.processResults}
        onDownload={crypto.handleDownloadResult}
        onRemove={crypto.removeResult}
        onClearAll={handleClearAll}
      />
    </div>
  )
}
