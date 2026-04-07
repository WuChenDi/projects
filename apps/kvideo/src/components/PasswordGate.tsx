'use client'

import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSubscriptionSync } from '@/lib/hooks/useSubscriptionSync'
import { settingsStore } from '@/lib/store/settings-store'

const SESSION_UNLOCKED_KEY = 'kvideo-unlocked'

export function PasswordGate({
  children,
  hasEnvPassword: initialHasEnvPassword,
}: {
  children: React.ReactNode
  hasEnvPassword: boolean
}) {
  // Enable background subscription syncing globally
  useSubscriptionSync()

  const [isLocked, setIsLocked] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [hasEnvPassword, setHasEnvPassword] = useState(initialHasEnvPassword)
  const [persistEnabled, setPersistEnabled] = useState(true)
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const settings = settingsStore.getSettings()

      // Check both storage if persistence might be enabled
      const getUnlockedState = (canPersist: boolean) => {
        const sessionUnlocked =
          sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true'
        if (!canPersist) return sessionUnlocked
        const localUnlocked =
          localStorage.getItem(SESSION_UNLOCKED_KEY) === 'true'
        return sessionUnlocked || localUnlocked
      }

      // 1. Initial local check (fast)
      // Determine if the app SHOULD be protected
      const isProtected =
        (settings.passwordAccess && settings.accessPasswords.length > 0) ||
        initialHasEnvPassword

      // Default to canPersist = true for first check if not sure
      const isUnlocked = getUnlockedState(true)
      const localLocked = isProtected && !isUnlocked
      if (mounted) setIsLocked(localLocked)
      if (mounted) setIsClient(true)

      // 2. Fetch remote config & sync
      try {
        const res = await fetch('/api/config')
        if (!res.ok) throw new Error('Failed to fetch config')

        const data = await res.json()

        if (mounted) {
          setHasEnvPassword(data.hasEnvPassword)
          setPersistEnabled(data.persistPassword)

          // CRITICAL: Sync subscriptions immediately
          if (data.subscriptionSources) {
            console.log('Syncing env subscriptions:', data.subscriptionSources)
            settingsStore.syncEnvSubscriptions(data.subscriptionSources)
          }

          // Re-evaluate lock status with confirmed server state
          // Persistence only works if hasEnvPassword is true
          const canPersist = data.hasEnvPassword && data.persistPassword
          const finalUnlocked = getUnlockedState(canPersist)

          const isProtectedNow =
            (settings.passwordAccess && settings.accessPasswords.length > 0) ||
            data.hasEnvPassword
          const confirmLocked = isProtectedNow && !finalUnlocked
          setIsLocked(confirmLocked)
        }
      } catch (e) {
        console.error('PasswordGate init failed:', e)
      }
    }

    void init()

    return () => {
      mounted = false
    }
  }, [initialHasEnvPassword])

  // Subscribe to settings changes (real-time updates)
  useEffect(() => {
    const handleSettingsUpdate = () => {
      const settings = settingsStore.getSettings()
      const canPersist = hasEnvPassword && persistEnabled
      const isUnlocked =
        sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true' ||
        (canPersist && localStorage.getItem(SESSION_UNLOCKED_KEY) === 'true')

      const isProtected =
        (settings.passwordAccess && settings.accessPasswords.length > 0) ||
        hasEnvPassword

      if (!isProtected) {
        setIsLocked(false)
      } else if (!isUnlocked) {
        setIsLocked(true)
      }
    }

    const unsubscribe = settingsStore.subscribe(handleSettingsUpdate)
    return () => unsubscribe()
  }, [hasEnvPassword, persistEnabled])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsValidating(true)

    const settings = settingsStore.getSettings()
    const canPersist = hasEnvPassword && persistEnabled

    const setUnlocked = () => {
      if (canPersist) {
        localStorage.setItem(SESSION_UNLOCKED_KEY, 'true')
      }
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true')
      setIsLocked(false)
      setError(false)
      setIsValidating(false)
    }

    // First check local passwords
    if (settings.accessPasswords.includes(password)) {
      setUnlocked()
      return
    }

    // Then check env password via API
    if (hasEnvPassword) {
      try {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        })
        const data = await res.json()
        if (data.valid) {
          setUnlocked()
          return
        }
      } catch {
        // API error
      }
    }

    // Password didn't match
    setError(true)
    setIsValidating(false)
    const form = document.getElementById('password-form')
    form?.classList.add('animate-shake')
    setTimeout(() => form?.classList.remove('animate-shake'), 500)
  }

  if (!isClient) return null // Prevent hydration mismatch

  if (!isLocked) {
    return <>{children}</>
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg-color)] bg-[image:var(--bg-image)] text-[var(--text-color)]">
      <div className="w-full max-w-md p-4">
        <form
          id="password-form"
          onSubmit={handleUnlock}
          className="bg-[var(--glass-bg)] backdrop-blur-[25px] saturate-[180%] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] p-8 shadow-[var(--shadow-md)] flex flex-col items-center gap-6 transition-all duration-[0.4s] cubic-bezier(0.2,0.8,0.2,1)"
        >
          <div className="w-16 h-16 rounded-[var(--radius-full)] bg-[var(--accent-color)]/10 flex items-center justify-center text-[var(--accent-color)] mb-2 shadow-[var(--shadow-sm)] border border-[var(--glass-border)]">
            <Lock size={32} />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">访问受限</h2>
            <p className="text-[var(--text-color-secondary)]">
              请输入访问密码以继续
            </p>
          </div>

          <div className="w-full space-y-4">
            <div className="space-y-2">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(false)
                }}
                placeholder="输入密码..."
                className={`w-full px-4 py-3 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border ${
                  error ? 'border-red-500' : 'border-[var(--glass-border)]'
                } focus:outline-none focus:border-[var(--accent-color)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-color)_30%,transparent)] transition-all duration-[0.4s] cubic-bezier(0.2,0.8,0.2,1) text-[var(--text-color)] placeholder-[var(--text-color-secondary)]`}
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-500 text-center animate-pulse">
                  密码错误
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-[var(--accent-color)] text-white font-bold rounded-[var(--radius-2xl)] hover:translate-y-[-2px] hover:brightness-110 shadow-[var(--shadow-sm)] hover:shadow-[0_4px_8px_var(--shadow-color)] active:translate-y-0 active:scale-[0.98] transition-all duration-200"
            >
              解锁访问
            </button>
          </div>
        </form>
      </div>
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  )
}
