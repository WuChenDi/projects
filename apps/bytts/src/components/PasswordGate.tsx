'use client'

import { Button } from '@cdlab/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@cdlab/ui/components/card'
import { PasswordInput } from '@cdlab/ui/components/password-input'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

const SESSION_UNLOCKED_KEY = 'tts-unlocked'

const getUnlockedState = (canPersist: boolean) => {
  const sessionUnlocked =
    sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true'
  if (!canPersist) return sessionUnlocked
  return (
    sessionUnlocked || localStorage.getItem(SESSION_UNLOCKED_KEY) === 'true'
  )
}

export function PasswordGate({
  children,
  hasEnvPassword: initialHasEnvPassword,
}: {
  children: React.ReactNode
  hasEnvPassword: boolean
}) {
  const [isLocked, setIsLocked] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [hasEnvPassword, setHasEnvPassword] = useState(initialHasEnvPassword)
  const [persistEnabled, setPersistEnabled] = useState(true)

  // 初始化：读取本地存储快速设置 lock 状态
  useEffect(() => {
    const isUnlocked = getUnlockedState(true)
    setIsLocked(initialHasEnvPassword && !isUnlocked)
    setIsClient(true)
  }, [initialHasEnvPassword])

  // 从服务端获取配置，用于校正 lock 状态
  const { data: configData } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const res = await fetch('/api/config')
      if (!res.ok) throw new Error('Failed to fetch config')
      return res.json() as Promise<{
        hasEnvPassword: boolean
        persistPassword: boolean
      }>
    },
    enabled: isClient,
  })

  useEffect(() => {
    if (!configData) return
    setHasEnvPassword(configData.hasEnvPassword)
    setPersistEnabled(configData.persistPassword)
    const canPersist = configData.hasEnvPassword && configData.persistPassword
    setIsLocked(configData.hasEnvPassword && !getUnlockedState(canPersist))
  }, [configData])

  // 验证密码
  const { mutateAsync: verifyPassword, isPending: isValidating } = useMutation({
    mutationFn: async (pwd: string) => {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      })
      const data = (await res.json()) as { valid: boolean }
      if (!data.valid) throw new Error('invalid')
      return data
    },
  })

  const triggerShake = () => {
    const card = document.getElementById('password-form')
    card?.classList.add('animate-shake')
    setTimeout(() => card?.classList.remove('animate-shake'), 500)
  }

  const handleUnlock = async () => {
    const canPersist = hasEnvPassword && persistEnabled
    try {
      await verifyPassword(password)
      if (canPersist) localStorage.setItem(SESSION_UNLOCKED_KEY, 'true')
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true')
      setIsLocked(false)
      setError(false)
    } catch {
      setError(true)
      triggerShake()
    }
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
              onKeyDown={(e) =>
                e.key === 'Enter' && !isValidating && password && handleUnlock()
              }
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
