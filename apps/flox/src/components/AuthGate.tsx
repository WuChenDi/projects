'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Input } from '@cdlab996/ui/components/input'
import { Label } from '@cdlab996/ui/components/label'
import type React from 'react'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true'

function LoginScreen() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError(null)
    setLoading(true)
    try {
      const res =
        mode === 'signIn'
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ name, email, password })
      if (res.error) {
        setError(res.error.message || '操作失败，请重试')
      }
      // On success the session cookie is set; useSession() refetches and the
      // gate swaps to the app automatically.
    } catch {
      setError('网络错误，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  async function google() {
    setError(null)
    setLoading(true)
    try {
      await authClient.signIn.social({ provider: 'google', callbackURL: '/' })
    } catch {
      setError('无法跳转 Google 登录')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === 'signIn' ? '登录 flox' : '注册 flox'}</CardTitle>
          <CardDescription>
            {mode === 'signIn'
              ? '使用邮箱密码登录以继续'
              : '创建账号以继续使用'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            {mode === 'signUp' && (
              <div className="space-y-2">
                <Label htmlFor="name">昵称</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                autoComplete={
                  mode === 'signIn' ? 'current-password' : 'new-password'
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '请稍候…' : mode === 'signIn' ? '登录' : '注册'}
            </Button>
          </form>

          {GOOGLE_ENABLED && (
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              disabled={loading}
              onClick={() => void google()}
            >
              使用 Google 登录
            </Button>
          )}

          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              setError(null)
              setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'))
            }}
          >
            {mode === 'signIn' ? '没有账号？去注册' : '已有账号？去登录'}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        加载中…
      </div>
    )
  }

  if (!session) return <LoginScreen />

  return <>{children}</>
}
