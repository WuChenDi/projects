'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
} from '@cdlab996/ui/components/field'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { LocaleSwitcher, SinkLogo, ThemeToggle } from '@/components/layout'
import { authClient } from '@/lib/auth-client'

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
        fill="currentColor"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 1A11 11 0 0 0 8.52 22.44c.55.1.75-.24.75-.53v-1.86c-3.06.67-3.71-1.48-3.71-1.48-.5-1.28-1.22-1.62-1.22-1.62-1-.68.08-.67.08-.67 1.1.08 1.68 1.14 1.68 1.14.98 1.68 2.57 1.2 3.2.92.1-.71.38-1.2.69-1.47-2.44-.28-5.01-1.22-5.01-5.43 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.4.11-2.91 0 0 .92-.3 3.02 1.13a10.5 10.5 0 0 1 5.5 0c2.1-1.43 3.02-1.13 3.02-1.13.6 1.51.22 2.63.11 2.91.7.77 1.13 1.75 1.13 2.95 0 4.22-2.58 5.15-5.03 5.42.4.34.75 1.01.75 2.04v3.03c0 .29.2.64.76.53A11 11 0 0 0 12 1Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function LoginPage() {
  const t = useTranslations('login')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<'google' | 'github' | null>(null)

  async function signIn(provider: 'google' | 'github') {
    setError(null)
    setPending(provider)
    try {
      await authClient.signIn.social({ provider, callbackURL: '/dashboard' })
    } catch {
      setError(t('error'))
      setPending(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 md:p-10">
      <div className="fixed top-4 right-4 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-4">
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <SinkLogo className="size-5" />
            </span>
            <h1 className="text-xl font-bold">{t('welcome')}</h1>
            <FieldDescription>{t('description')}</FieldDescription>
          </div>
          <Field className="grid gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => void signIn('google')}
              disabled={pending !== null}
            >
              <GoogleIcon />
              {pending === 'google'
                ? t('redirecting')
                : t('continueWithGoogle')}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => void signIn('github')}
              disabled={pending !== null}
            >
              <GitHubIcon />
              {pending === 'github'
                ? t('redirecting')
                : t('continueWithGitHub')}
            </Button>
          </Field>
          {error && (
            <FieldDescription className="text-center text-destructive">
              {error}
            </FieldDescription>
          )}
        </FieldGroup>
        <FieldDescription className="px-6 text-center">
          {t.rich('agreement', {
            terms: (chunks) => (
              <Link
                href="/dashboard/terms"
                className="underline underline-offset-4 hover:text-foreground"
              >
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link
                href="/dashboard/privacy"
                className="underline underline-offset-4 hover:text-foreground"
              >
                {chunks}
              </Link>
            ),
          })}
        </FieldDescription>
      </div>
    </div>
  )
}
