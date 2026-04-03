'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Tabs, TabsContent } from '@cdlab996/ui/components/tabs'
import { IKPageContainer } from '@cdlab996/ui/IK'
import { Loader2, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { EmailShare } from '@/components/EmailShare'
import { RetrieveTab } from '@/components/retrieve/RetrieveTab'
import { ShareTab } from '@/components/share/ShareTab'
import { TOTPModal } from '@/components/TOTPModal'
import { PocketChestAPI } from '@/lib'
import { useAuthStore } from '@/store/useAuthStore'

type TabMode = 'share' | 'retrieve'

function HomeContent() {
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')

  const initialTab: TabMode = codeFromUrl ? 'retrieve' : 'share'
  const [activeTab, setActiveTab] = useState<TabMode>(initialTab)

  // Config state
  const [requireTOTP, setRequireTOTP] = useState(false)
  const [emailShareEnabled, setEmailShareEnabled] = useState(false)
  const [isShareUnlocked, setIsShareUnlocked] = useState(false)

  // TOTP state
  const [showTOTPModal, setShowTOTPModal] = useState(false)
  const [totpError, setTotpError] = useState('')
  const { totpToken, setTotpToken } = useAuthStore()

  // Email share state
  const [showEmailShare, setShowEmailShare] = useState(false)
  const [emailShareCode, setEmailShareCode] = useState('')

  // Error state
  const [configError, setConfigError] = useState<string | null>(null)

  // Retrieve URL params — parse hash synchronously for initial render
  const [retrieveEncryptionKey] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const match = window.location.hash.match(/key=([^&]+)/)
      if (match?.[1]) return decodeURIComponent(match[1])
    }
    return null
  })

  const api = new PocketChestAPI()

  // Init: fetch config
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    api
      .getConfig()
      .then((config) => {
        setRequireTOTP(config.requireTOTP)
        setEmailShareEnabled(config.emailShareEnabled)
        if (!config.requireTOTP) {
          setIsShareUnlocked(true)
        } else if (useAuthStore.getState().totpToken) {
          setIsShareUnlocked(true)
        }
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

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabMode)}
          className="h-full"
        >
          <TabsContent value="share" className="h-full">
            <ShareTab
              requireTOTP={requireTOTP}
              emailShareEnabled={emailShareEnabled}
              onUnlockTOTP={handleUnlockShare}
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
