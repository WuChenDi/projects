'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Input } from '@cdlab996/ui/components/input'
import { Label } from '@cdlab996/ui/components/label'
import { Separator } from '@cdlab996/ui/components/separator'
import { Spinner } from '@cdlab996/ui/components/spinner'
import { Switch } from '@cdlab996/ui/components/switch'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, RefreshCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { GlobalConfig } from '@/database/schema'

// GET /api/settings masks secrets and adds presence flags; PATCH on regenerate
// returns the full row (so the new pushApiToken can be displayed once).
type SettingsResponse = GlobalConfig & {
  hasWechatAppSecret?: boolean
  hasPushApiToken?: boolean
}

type SettingsPatch = Partial<{
  wechatAppId: string
  wechatAppSecret: string
  defaultWechatTemplateId: string
  maxPushOneMinute: number
  sleepTime: number
  apiTimeout: number
  maxRetries: number
  retryDelay: number
  cronEnabled: boolean
  cronUserIds: string[]
  regeneratePushApiToken: boolean
}>

async function fetchSettings(): Promise<SettingsResponse> {
  const res = await fetch('/api/settings')
  if (!res.ok) throw new Error('Failed to load settings')
  return res.json()
}

async function patchSettings(patch: SettingsPatch): Promise<SettingsResponse> {
  const res = await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Failed to save settings')
  return res.json()
}

export default function SettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  })

  const [form, setForm] = useState<SettingsPatch>({})

  useEffect(() => {
    if (!data) return
    setForm({
      wechatAppId: data.wechatAppId,
      // wechatAppSecret is never returned cleartext; leave empty unless the
      // user types a new value (server treats empty as "keep existing").
      wechatAppSecret: '',
      defaultWechatTemplateId: data.defaultWechatTemplateId,
      maxPushOneMinute: data.maxPushOneMinute,
      sleepTime: data.sleepTime,
      apiTimeout: data.apiTimeout,
      maxRetries: data.maxRetries,
      retryDelay: data.retryDelay,
      cronEnabled: data.cronEnabled,
      cronUserIds: data.cronUserIds,
    })
  }, [data])

  const save = useMutation({
    mutationFn: patchSettings,
    onSuccess: (fresh) => {
      qc.setQueryData(['settings'], fresh)
      toast.success('已保存')
    },
    onError: () => toast.error('保存失败'),
  })

  const regen = useMutation({
    mutationFn: () => patchSettings({ regeneratePushApiToken: true }),
    onSuccess: (fresh) => {
      qc.setQueryData(['settings'], fresh)
      toast.success('已生成新 token')
    },
    onError: () => toast.error('生成失败'),
  })

  const copyToken = async () => {
    if (!data?.pushApiToken) return
    await navigator.clipboard.writeText(data.pushApiToken)
    toast.success('已复制 token')
  }

  if (isLoading || !data) {
    return (
      <main className="container mx-auto flex max-w-3xl items-center justify-center px-6 py-24">
        <Spinner className="size-6" />
      </main>
    )
  }

  const set =
    <K extends keyof SettingsPatch>(key: K) =>
    (value: SettingsPatch[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <main className="container mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">全局配置</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            微信 / 节流参数 / 推送触发 token
          </p>
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm">
            返回
          </Button>
        </Link>
      </header>

      <Section
        title="微信测试号"
        desc="申请测试号后填写 APP_ID 与 APP_SECRET，并指定默认模板 ID。"
      >
        <TextField
          label="APP_ID"
          value={form.wechatAppId ?? ''}
          onChange={set('wechatAppId')}
        />
        <TextField
          label="APP_SECRET"
          value={form.wechatAppSecret ?? ''}
          onChange={set('wechatAppSecret')}
          type="password"
          placeholder={
            data.hasWechatAppSecret ? '已配置，留空保持不变' : '尚未配置'
          }
        />
        <TextField
          label="默认模板 ID"
          value={form.defaultWechatTemplateId ?? ''}
          onChange={set('defaultWechatTemplateId')}
        />
      </Section>

      <Separator className="my-8" />

      <Section title="节流参数" desc="控制推送速率与重试策略。">
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="每分钟最大推送数"
            value={form.maxPushOneMinute ?? 5}
            onChange={set('maxPushOneMinute')}
          />
          <NumberField
            label="节流暂停毫秒"
            value={form.sleepTime ?? 65000}
            onChange={set('sleepTime')}
          />
          <NumberField
            label="API 超时毫秒"
            value={form.apiTimeout ?? 10000}
            onChange={set('apiTimeout')}
          />
          <NumberField
            label="最大重试次数"
            value={form.maxRetries ?? 3}
            onChange={set('maxRetries')}
          />
          <NumberField
            label="重试基础延迟毫秒"
            value={form.retryDelay ?? 2000}
            onChange={set('retryDelay')}
          />
        </div>
      </Section>

      <Separator className="my-8" />

      <Section
        title="HTTP 触发 token"
        desc="调用 POST /api/push/run 时通过 Authorization: Bearer <token> 鉴权。生成后仅本次会话可见，刷新页面后将再次隐藏。"
      >
        <div className="flex items-center gap-2">
          <Input
            value={data.pushApiToken}
            readOnly
            className="font-mono"
            placeholder={
              data.hasPushApiToken ? '已配置，点右侧按钮可重置' : '尚未配置'
            }
          />
          <Button
            variant="outline"
            size="icon"
            disabled={!data.pushApiToken}
            onClick={() => void copyToken()}
            aria-label="复制 token"
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={regen.isPending}
            onClick={() => regen.mutate()}
            aria-label="生成新 token"
          >
            <RefreshCcw className="size-4" />
          </Button>
        </div>
      </Section>

      <Separator className="my-8" />

      <Section
        title="定时触发"
        desc="勾选后由 Worker scheduled() 触发；在 M5 完成接线。"
      >
        <div className="flex items-center gap-3">
          <Switch
            checked={form.cronEnabled ?? false}
            onCheckedChange={set('cronEnabled')}
            id="cron-enabled"
          />
          <Label htmlFor="cron-enabled">启用定时推送</Label>
        </div>
      </Section>

      <div className="mt-10 flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => data && setForm({ ...data })}
          disabled={save.isPending}
        >
          重置
        </Button>
        <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
          {save.isPending ? '保存中...' : '保存'}
        </Button>
      </div>
    </main>
  )
}

function Section({
  title,
  desc,
  children,
}: {
  title: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      {desc ? (
        <p className="mt-1 mb-4 text-sm text-muted-foreground">{desc}</p>
      ) : null}
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'password'
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10)
          onChange(Number.isFinite(n) ? n : 0)
        }}
      />
    </div>
  )
}
