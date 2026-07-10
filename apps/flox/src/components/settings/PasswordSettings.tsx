'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@cdlab/ui/components/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab/ui/components/card'
import { ShieldCheck } from 'lucide-react'

export function PasswordSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>访问控制</CardTitle>
        <CardDescription>应用通过环境变量启用访问密码保护。</CardDescription>
      </CardHeader>

      <CardContent>
        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle>环境变量密码已启用</AlertTitle>
          <AlertDescription>
            通过{' '}
            <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
              ACCESS_PASSWORD
            </code>{' '}
            环境变量设置，无法在此修改
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
