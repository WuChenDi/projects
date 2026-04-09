'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { PasswordInput } from '@cdlab996/ui/components/password-input'
import { useEffect, useState } from 'react'
import { useSubscriptionSync } from '@/lib/hooks/useSubscriptionSync'
import { settingsStore } from '@/lib/store/settings-store'

const SESSION_UNLOCKED_KEY = 'flox-unlocked'

export function PasswordGate({
  children,
  hasEnvPassword: initialHasEnvPassword,
}: {
  children: React.ReactNode
  hasEnvPassword: boolean
}) {
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

      const getUnlockedState = (canPersist: boolean) => {
        const sessionUnlocked =
          sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true'
        if (!canPersist) return sessionUnlocked
        const localUnlocked =
          localStorage.getItem(SESSION_UNLOCKED_KEY) === 'true'
        return sessionUnlocked || localUnlocked
      }

      const isProtected =
        (settings.passwordAccess && settings.accessPasswords.length > 0) ||
        initialHasEnvPassword

      const isUnlocked = getUnlockedState(true)
      if (mounted) setIsLocked(isProtected && !isUnlocked)
      if (mounted) setIsClient(true)

      try {
        const res = await fetch('/api/config')
        if (!res.ok) throw new Error('Failed to fetch config')
        const data = await res.json()

        if (mounted) {
          setHasEnvPassword(data.hasEnvPassword)
          setPersistEnabled(data.persistPassword)

          if (data.subscriptionSources) {
            settingsStore.syncEnvSubscriptions(data.subscriptionSources)
          }

          const canPersist = data.hasEnvPassword && data.persistPassword
          const finalUnlocked = getUnlockedState(canPersist)
          const isProtectedNow =
            (settings.passwordAccess && settings.accessPasswords.length > 0) ||
            data.hasEnvPassword
          setIsLocked(isProtectedNow && !finalUnlocked)
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

      if (!isProtected) setIsLocked(false)
      else if (!isUnlocked) setIsLocked(true)
    }

    const unsubscribe = settingsStore.subscribe(handleSettingsUpdate)
    return () => unsubscribe()
  }, [hasEnvPassword, persistEnabled])

  const triggerShake = () => {
    const card = document.getElementById('password-form')
    card?.classList.add('animate-shake')
    setTimeout(() => card?.classList.remove('animate-shake'), 500)
  }

  const handleUnlock = async () => {
    setIsValidating(true)

    const settings = settingsStore.getSettings()
    const canPersist = hasEnvPassword && persistEnabled

    const setUnlocked = () => {
      if (canPersist) localStorage.setItem(SESSION_UNLOCKED_KEY, 'true')
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true')
      setIsLocked(false)
      setError(false)
      setIsValidating(false)
    }

    if (settings.accessPasswords.includes(password)) {
      setUnlocked()
      return
    }

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

    setError(true)
    setIsValidating(false)
    triggerShake()
  }

  if (!isClient) return null
  if (!isLocked) return <>{children}</>

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center">
      <Card id="password-form" className="w-full max-w-md">
        <CardHeader>
          <CardTitle>访问受限</CardTitle>
          <CardDescription>请输入访问密码以继续</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <PasswordInput
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(false)
              }}
              placeholder="输入密码..."
              autoFocus
              aria-invalid={error}
              aria-describedby={error ? 'pwd-gate-error' : undefined}
            />
            {error && (
              <p id="pwd-gate-error" className="text-sm text-destructive">
                密码错误
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleUnlock}
            disabled={!password || isValidating}
          >
            {isValidating ? '验证中...' : '解锁访问'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
