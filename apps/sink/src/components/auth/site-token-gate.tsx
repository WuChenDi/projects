'use client'

import { Spinner } from '@cdlab996/ui/components/spinner'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { verifyToken } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

// Client-side dashboard gate. Re-verifies the stored site token against
// /api/verify on mount; on failure it clears the token and bounces to login.
export function SiteTokenGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const token = useAuthStore((s) => s.token)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const signOut = useAuthStore((s) => s.signOut)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return
    if (!token) {
      router.replace('/dashboard/login')
      return
    }
    let active = true
    verifyToken(token)
      .then((ok) => {
        if (!active) return
        if (ok) {
          setChecked(true)
        } else {
          signOut()
          router.replace('/dashboard/login')
        }
      })
      .catch(() => {
        if (!active) return
        signOut()
        router.replace('/dashboard/login')
      })
    return () => {
      active = false
    }
  }, [hasHydrated, token, router, signOut])

  if (!hasHydrated || !checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    )
  }

  return <>{children}</>
}
