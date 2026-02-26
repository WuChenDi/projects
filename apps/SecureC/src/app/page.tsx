'use client'

import { toast } from 'sonner'
import { PageContainer } from '@/components/layout'
import {
  SCFeaturesSection,
  SCInputPanel,
  SCResultsPanel,
} from '@/components/SC'
import { useCryptoProcessor } from '@/hooks/useCryptoProcessor'

export default function PasswordPage() {
  const {
    password,
    setPassword,
    fileInfo,
    textInput,
    setTextInput,
    inputMode,
    setInputMode,
    activeTab,
    handleTabChange,
    fileInputRef,
    handleFileSelect,
    processInput,
    handleDownloadResult,
    processResults,
    removeResult,
    isProcessDisabled,
  } = useCryptoProcessor()

  const handleClearAll = () => {
    processResults.forEach((result) => {
      if (result.downloadUrl) {
        URL.revokeObjectURL(result.downloadUrl)
      }
      removeResult(result.id)
    })
    toast.success('All results cleared')
  }

  return (
    <PageContainer scrollable={false}>
      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        <div className="space-y-4">
          <SCInputPanel
            activeTab={activeTab}
            onTabChange={handleTabChange}
            inputMode={inputMode}
            onInputModeChange={setInputMode}
            password={password}
            onPasswordChange={setPassword}
            fileInfo={fileInfo}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            textInput={textInput}
            onTextInputChange={setTextInput}
            onProcess={processInput}
            isProcessDisabled={isProcessDisabled}
          />
          <SCFeaturesSection />
        </div>

        <SCResultsPanel
          results={processResults}
          onDownload={handleDownloadResult}
          onRemove={removeResult}
          onClearAll={handleClearAll}
        />
      </div>
    </PageContainer>
  )
}
