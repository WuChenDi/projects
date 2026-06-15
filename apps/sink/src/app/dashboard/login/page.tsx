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
import {
  Field,
  FieldDescription,
  FieldGroup,
} from '@cdlab996/ui/components/field'
import { PasswordInput } from '@cdlab996/ui/components/password-input'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import * as z from 'zod'
import { verifyToken } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

export default function LoginPage() {
  const t = useTranslations('login')
  const router = useRouter()
  const setToken = useAuthStore((s) => s.setToken)

  const verify = useMutation({
    mutationFn: (token: string) => verifyToken(token),
  })

  const form = useForm({
    defaultValues: { token: '' },
    validators: {
      onSubmit: z.object({ token: z.string().min(1, t('required')) }),
    },
    onSubmit: async ({ value, formApi }) => {
      const ok = await verify.mutateAsync(value.token)
      if (ok) {
        setToken(value.token)
        router.replace('/dashboard')
        return
      }
      // Surface the server rejection on the field.
      formApi.setFieldMeta('token', (prev) => ({
        ...prev,
        errors: [t('invalid')],
        errorMap: { onSubmit: t('invalid') },
      }))
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field name="token">
              {(field) => {
                const error = field.state.meta.errors[0]
                const message =
                  typeof error === 'string' ? error : error?.message
                return (
                  <>
                    <CardContent>
                      <Field>
                        <PasswordInput
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          placeholder={t('tokenPlaceholder')}
                          aria-label={t('tokenLabel')}
                          autoFocus
                          aria-invalid={!!message}
                          aria-describedby={message ? 'login-error' : undefined}
                        />
                        {message && (
                          <FieldDescription
                            id="login-error"
                            className="text-destructive"
                          >
                            {message}
                          </FieldDescription>
                        )}
                      </Field>
                    </CardContent>
                    <CardFooter>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={
                          !field.state.value ||
                          verify.isPending ||
                          form.state.isSubmitting
                        }
                      >
                        {verify.isPending || form.state.isSubmitting
                          ? t('verifying')
                          : t('submit')}
                      </Button>
                    </CardFooter>
                  </>
                )
              }}
            </form.Field>
          </FieldGroup>
        </form>
      </Card>
    </div>
  )
}
