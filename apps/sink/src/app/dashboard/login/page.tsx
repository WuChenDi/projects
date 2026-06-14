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
import { Field, FieldDescription } from '@cdlab996/ui/components/field'
import { PasswordInput } from '@cdlab996/ui/components/password-input'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { verifyToken } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

export default function LoginPage() {
  const t = useTranslations('login')
  const router = useRouter()
  const setToken = useAuthStore((s) => s.setToken)
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value || pending) return
    setPending(true)
    setError(false)
    try {
      const ok = await verifyToken(value)
      if (ok) {
        setToken(value)
        router.replace('/dashboard')
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent>
            <Field>
              <PasswordInput
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  setError(false)
                }}
                placeholder={t('tokenPlaceholder')}
                aria-label={t('tokenLabel')}
                aria-invalid={error}
                autoFocus
              />
              {error && (
                <FieldDescription className="text-destructive">
                  {t('invalid')}
                </FieldDescription>
              )}
            </Field>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={!value || pending}
            >
              {pending ? t('verifying') : t('submit')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
