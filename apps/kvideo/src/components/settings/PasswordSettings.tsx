'use client'

import { Eye, EyeOff, Plus, Shield, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Switch } from '@cdlab996/ui/components/switch'
import { SettingsSection } from './SettingsSection'

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

  // If env password is set, access control is automatically enabled
  const isActive = enabled || envPasswordSet

  return (
    <SettingsSection title="访问控制" description="为应用启用密码保护功能。">
      <div className="space-y-6">
        {/* Toggle - only shown if no env password */}
        {!envPasswordSet && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--text-color)]">
              启用密码访问
            </label>
            <Switch
              checked={enabled}
              onCheckedChange={onToggle}
              aria-label="启用密码访问开关"
            />
          </div>
        )}

        {/* Env Password Notice */}
        {envPasswordSet && (
          <div className="flex items-center gap-3 p-4 bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] border border-[var(--accent-color)]/30 rounded-[var(--radius-2xl)]">
            <ShieldCheck
              className="text-[var(--accent-color)] shrink-0"
              size={24}
            />
            <div>
              <p className="text-sm font-medium text-[var(--text-color)]">
                环境变量密码已启用
              </p>
              <p className="text-xs text-[var(--text-color-secondary)]">
                通过{' '}
                <code className="px-1 py-0.5 bg-[var(--glass-bg)] rounded">
                  ACCESS_PASSWORD
                </code>{' '}
                环境变量设置，无法在此删除
              </p>
            </div>
          </div>
        )}

        {isActive && (
          <div className="space-y-4 pt-4 border-t border-[var(--glass-border)] animate-in fade-in slide-in-from-top-2">
            {/* Local Passwords Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield
                  size={16}
                  className="text-[var(--text-color-secondary)]"
                />
                <h4 className="text-sm font-medium text-[var(--text-color)]">
                  本地保存密码
                </h4>
              </div>
              <p className="text-xs text-[var(--text-color-secondary)]">
                仅在当前浏览器/设备有效，可随时添加或删除
              </p>

              {passwords.length === 0 && !envPasswordSet && (
                <p className="text-sm text-[var(--text-color-secondary)] italic">
                  未设置本地密码。在至少添加一个密码之前，任何人都可以访问。
                </p>
              )}

              {passwords.length === 0 && envPasswordSet && (
                <p className="text-sm text-[var(--text-color-secondary)] italic">
                  暂无本地密码。可以添加额外的本地密码作为备用。
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {passwords.map((pwd, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-full)] text-sm transition-all duration-300 hover:scale-105"
                  >
                    <span className="font-mono">
                      {showPassword ? pwd : '••••••'}
                    </span>
                    <button
                      onClick={() => onRemove(pwd)}
                      className="text-[var(--text-color-secondary)] hover:text-red-500 transition-colors cursor-pointer"
                      title="删除密码"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleAdd} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setError('')
                    }}
                    placeholder="添加新的本地密码..."
                    className="w-full px-4 py-2 pr-10 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] focus:outline-none focus:border-[var(--accent-color)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-color)_30%,transparent)] transition-all duration-[0.4s] cubic-bezier(0.2,0.8,0.2,1) text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-color-secondary)] hover:text-[var(--text-color)] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {error && <p className="text-xs text-red-500 pl-2">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={!newPassword}
                className="p-2 bg-[var(--accent-color)] text-white rounded-[var(--radius-2xl)] hover:translate-y-[-2px] hover:brightness-110 shadow-[var(--shadow-sm)] hover:shadow-[0_4px_8px_var(--shadow-color)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none transition-all duration-200 cursor-pointer"
              >
                <Plus size={20} />
              </button>
            </form>
          </div>
        )}
      </div>
    </SettingsSection>
  )
}
