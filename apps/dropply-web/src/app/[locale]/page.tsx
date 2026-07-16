'use client'

import { Button } from '@cdlab/ui/components/button'
import { Tabs, TabsContent } from '@cdlab/ui/components/tabs'
import { IKPageContainer } from '@cdlab/ui/IK'
import { Loader2, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { EmailShare } from '@/components/EmailShare'
import { LocalCryptoPanel } from '@/components/local-crypto/LocalCryptoPanel'
import { RetrieveTab } from '@/components/retrieve/RetrieveTab'
import { ShareTab } from '@/components/share/ShareTab'
import { TOTPModal } from '@/components/TOTPModal'
import { TopTabs } from '@/components/TopTabs'
import { useCryptoProcessor } from '@/hooks/useCryptoProcessor'
import { PocketChestAPI } from '@/lib'
import { useAuthStore } from '@/store/useAuthStore'
import { ModeEnum } from '@/types/crypto'

type TabMode = 'encrypt' | 'decrypt' | 'share' | 'retrieve'

function HomeContent() {
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')

  // Retrieve URL params — parse hash synchronously for initial render
  const [retrieveEncryptionKey] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const match = window.location.hash.match(/key=([^&]+)/)
      if (match?.[1]) return decodeURIComponent(match[1])
    }
    return null
  })

  // Deep link: ?code=... or #key=... lands on the Retrieve tab, prefilled as before.
  const initialTab: TabMode =
    codeFromUrl || retrieveEncryptionKey ? 'retrieve' : 'share'
  const [activeTab, setActiveTab] = useState<TabMode>(initialTab)

  // Local (client-side) encrypt/decrypt engine — shared across the Encrypt and
  // Decrypt tabs so input/results survive the auto-switch below.
  const crypto = useCryptoProcessor()

  // detect() auto-switch: when the engine detects ciphertext it flips its internal
  // mode to DECRYPT; reflect that to the top-level tab so the user lands on Decrypt.
  useEffect(() => {
    if (crypto.activeTab === ModeEnum.DECRYPT) {
      setActiveTab((prev) => (prev === 'encrypt' ? 'decrypt' : prev))
    }
  }, [crypto.activeTab])

  // Config state
  const [isConfigLoaded, setIsConfigLoaded] = useState(false)
  const [requireTOTP, setRequireTOTP] = useState(false)
  const [emailShareEnabled, setEmailShareEnabled] = useState(false)
  const [maxFileSize, setMaxFileSize] = useState(100 * 1024 * 1024)
  const [isShareUnlocked, setIsShareUnlocked] = useState(false)

  // TOTP state
  const [showTOTPModal, setShowTOTPModal] = useState(false)
  const [totpError, setTotpError] = useState('')
  const { totpToken, setTotpToken, clearTotpToken } = useAuthStore()

  // Email share state
  const [showEmailShare, setShowEmailShare] = useState(false)
  const [emailShareCode, setEmailShareCode] = useState('')

  // Error state
  const [configError, setConfigError] = useState<string | null>(null)

  const api = new PocketChestAPI()

  // Init: fetch config
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch config once on mount
  useEffect(() => {
    api
      .getConfig()
      .then((config) => {
        setRequireTOTP(config.requireTOTP)
        setEmailShareEnabled(config.emailShareEnabled)
        setMaxFileSize(config.maxFileSize)
        if (!config.requireTOTP) {
          setIsShareUnlocked(true)
        } else if (useAuthStore.getState().totpToken) {
          setIsShareUnlocked(true)
        }
        setIsConfigLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to fetch config:', err)
        setConfigError('Failed to load configuration')
      })
  }, [])

  // TOTP handlers
  const handleUnlockShare = () => {
    setTotpError('')
    setShowTOTPModal(true)
  }

  const handleAuthExpired = () => {
    clearTotpToken()
    setIsShareUnlocked(false)
    setShowTOTPModal(true)
  }

  const handleTOTPSubmit = async (token: string) => {
    setTotpError('')
    try {
      await api.createChest(token)
      setTotpToken(token)
      setIsShareUnlocked(true)
      setShowTOTPModal(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Authentication failed'
      setTotpError(message)
      throw err
    }
  }

  const handleEmailShare = (code: string) => {
    setEmailShareCode(code)
    setShowEmailShare(true)
  }

  return (
    <IKPageContainer scrollable={false}>
      <div className="w-full h-full">
        {configError && (
          <div className="mb-4 flex items-center justify-between gap-3 p-4 rounded-lg border border-red-200/50 bg-red-50/80 dark:bg-red-950/30 dark:border-red-800/50">
            <p className="text-red-700 dark:text-red-300 font-medium">
              {configError}
            </p>
            <Button
              onClick={() => setConfigError(null)}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 h-auto p-1"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}

        {!isConfigLoaded && !configError && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="size-8 text-muted-foreground animate-spin" />
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const tab = v as TabMode
            setActiveTab(tab)
            // Keep the shared engine's mode in sync with the top-level tab.
            if (tab === 'encrypt') crypto.handleTabChange(ModeEnum.ENCRYPT)
            else if (tab === 'decrypt') crypto.handleTabChange(ModeEnum.DECRYPT)
          }}
          className={isConfigLoaded ? 'h-full' : 'hidden'}
        >
          <TopTabs />

          <TabsContent value="encrypt" className="h-full">
            <LocalCryptoPanel crypto={crypto} mode={ModeEnum.ENCRYPT} />
          </TabsContent>

          <TabsContent value="decrypt" className="h-full">
            <LocalCryptoPanel crypto={crypto} mode={ModeEnum.DECRYPT} />
          </TabsContent>

          <TabsContent value="share" className="h-full">
            <ShareTab
              requireTOTP={requireTOTP}
              emailShareEnabled={emailShareEnabled}
              maxFileSize={maxFileSize}
              onUnlockTOTP={handleUnlockShare}
              onAuthExpired={handleAuthExpired}
              isShareUnlocked={isShareUnlocked}
              totpToken={totpToken}
              onEmailShare={handleEmailShare}
            />
          </TabsContent>

          <TabsContent value="retrieve" className="h-full">
            <RetrieveTab
              initialCode={codeFromUrl || undefined}
              initialEncryptionKey={retrieveEncryptionKey}
            />
          </TabsContent>
        </Tabs>
      </div>

      <EmailShare
        retrievalCode={emailShareCode}
        isVisible={showEmailShare}
        onClose={() => setShowEmailShare(false)}
      />

      <TOTPModal
        isOpen={showTOTPModal}
        onClose={() => {
          setShowTOTPModal(false)
          setTotpError('')
        }}
        onSubmit={handleTOTPSubmit}
        error={totpError}
        allowCancel={true}
      />
    </IKPageContainer>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center">
          <Loader2 className="size-12 text-muted-foreground animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
