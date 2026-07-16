'use client'

import { Button } from '@cdlab/ui/components/button'
import { Field, FieldDescription, FieldGroup } from '@cdlab/ui/components/field'
import { GitHubIcon } from '@cdlab/ui/icon/GitHubIcon'
import { GoogleIcon } from '@cdlab/ui/icon/GoogleIcon'
import Link from 'next/link'
import { useState } from 'react'
import { WepushLogo } from '@/components/layout/logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { authClient } from '@/lib/auth-client'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<'google' | 'github' | null>(null)

  async function signIn(provider: 'google' | 'github') {
    setError(null)
    setPending(provider)
    try {
      await authClient.signIn.social({ provider, callbackURL: '/dashboard' })
    } catch {
      setError('登录失败，请重试')
      setPending(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 md:p-10">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-4">
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <WepushLogo className="size-8 text-primary" />
            <h1 className="text-xl font-bold">登录 wepush</h1>
            <FieldDescription>
              使用第三方账号登录，进入推送控制台
            </FieldDescription>
          </div>
          <Field className="grid gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => void signIn('google')}
              disabled={pending !== null}
            >
              <GoogleIcon />
              {pending === 'google' ? '跳转中...' : '使用 Google 登录'}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => void signIn('github')}
              disabled={pending !== null}
            >
              <GitHubIcon />
              {pending === 'github' ? '跳转中...' : '使用 GitHub 登录'}
            </Button>
          </Field>
          {error && (
            <FieldDescription className="text-center text-destructive">
              {error}
            </FieldDescription>
          )}
        </FieldGroup>
        <FieldDescription className="px-6 text-center">
          登录即表示你同意我们的{' '}
          <Link
            href="/terms"
            className="underline underline-offset-4 hover:text-foreground"
          >
            服务条款
          </Link>{' '}
          与{' '}
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:text-foreground"
          >
            隐私政策
          </Link>
          。
        </FieldDescription>
      </div>
    </div>
  )
}
