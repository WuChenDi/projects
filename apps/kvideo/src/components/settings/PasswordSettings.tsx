'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@cdlab996/ui/components/alert'
import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Input } from '@cdlab996/ui/components/input'
import { Label } from '@cdlab996/ui/components/label'
import { Switch } from '@cdlab996/ui/components/switch'
import { Eye, EyeOff, Plus, Shield, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface PasswordSettingsProps {
  enabled: boolean
  passwords: string[]
  envPasswordSet: boolean
  onToggle: (enabled: boolean) => void
  onAdd: (password: string) => void
  onRemove: (password: string) => void
}

export function PasswordSettings({
  enabled,
  passwords,
  envPasswordSet,
  onToggle,
  onAdd,
  onRemove,
}: PasswordSettingsProps) {
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) return
    if (passwords.includes(newPassword)) {
      setError('密码已存在')
      return
    }
    onAdd(newPassword)
    setNewPassword('')
    setError('')
  }

  const isActive = enabled || envPasswordSet

  return (
    <Card>
      <CardHeader>
        <CardTitle>访问控制</CardTitle>
        <CardDescription>为应用启用密码保护功能。</CardDescription>
        {!envPasswordSet && (
          <CardAction>
            <div className="flex items-center gap-2">
              <Label htmlFor="password-toggle">启用密码访问</Label>
              <Switch
                id="password-toggle"
                checked={enabled}
                onCheckedChange={onToggle}
                aria-label="启用密码访问开关"
              />
            </div>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {envPasswordSet && (
          <Alert>
            <ShieldCheck className="size-4" />
            <AlertTitle>环境变量密码已启用</AlertTitle>
            <AlertDescription>
              通过{' '}
              <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                ACCESS_PASSWORD
              </code>{' '}
              环境变量设置，无法在此删除
            </AlertDescription>
          </Alert>
        )}

        {isActive && (
          <div className="space-y-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield size={15} className="text-muted-foreground" />
                <span className="text-sm font-medium">本地保存密码</span>
              </div>
              <p className="text-xs text-muted-foreground">
                仅在当前浏览器/设备有效，可随时添加或删除
              </p>

              {passwords.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  {envPasswordSet
                    ? '暂无本地密码。可以添加额外的本地密码作为备用。'
                    : '未设置本地密码。在至少添加一个密码之前，任何人都可以访问。'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {passwords.map((pwd, index) => (
                    <Badge
                      // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
                      key={index}
                      variant="secondary"
                      className="gap-2 px-3 py-1.5 font-mono text-sm transition-transform hover:scale-105"
                    >
                      {showPassword ? pwd : '••••••'}
                      <button
                        onClick={() => onRemove(pwd)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="删除密码"
                      >
                        <Trash2 size={13} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAdd} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1.5">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setError('')
                    }}
                    placeholder="添加新的本地密码..."
                    className="pr-10"
                    aria-invalid={!!error}
                    aria-describedby={error ? 'pwd-error' : undefined}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-7 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </Button>
                </div>
                {error && (
                  <p id="pwd-error" className="text-xs text-destructive pl-1">
                    {error}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                size="icon"
                disabled={!newPassword}
                aria-label="添加密码"
              >
                <Plus size={18} />
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
