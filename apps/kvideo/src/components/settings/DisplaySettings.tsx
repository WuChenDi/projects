'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from '@cdlab996/ui/components/field'
import { Separator } from '@cdlab996/ui/components/separator'
import { Switch } from '@cdlab996/ui/components/switch'
import { cn } from '@cdlab996/ui/lib/utils'
import type { SearchDisplayMode } from '@/lib/store/settings-store'

interface DisplaySettingsProps {
  realtimeLatency: boolean
  searchDisplayMode: SearchDisplayMode
  rememberScrollPosition: boolean
  onRealtimeLatencyChange: (enabled: boolean) => void
  onSearchDisplayModeChange: (mode: SearchDisplayMode) => void
  onRememberScrollPositionChange: (enabled: boolean) => void
}

const DISPLAY_MODES: {
  value: SearchDisplayMode
  label: string
  description: string
}[] = [
  {
    value: 'normal',
    label: '默认显示',
    description: '每个源的结果单独显示',
  },
  {
    value: 'grouped',
    label: '合并同名源',
    description: '相同名称的视频合并为一个卡片',
  },
]

export function DisplaySettings({
  realtimeLatency,
  searchDisplayMode,
  rememberScrollPosition,
  onRealtimeLatencyChange,
  onSearchDisplayModeChange,
  onRememberScrollPositionChange,
}: DisplaySettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>显示设置</CardTitle>
        <CardDescription>调整搜索结果的展示与性能显示偏好。</CardDescription>
      </CardHeader>

      <CardContent>
        <FieldGroup>
          <Field className="flex flex-row items-center justify-between gap-4">
            <div>
              <FieldTitle>记住滚动位置</FieldTitle>
              <FieldDescription>
                退出或刷新页面后，自动恢复到之前的滚动位置
              </FieldDescription>
            </div>
            <Switch
              id="remember-scroll"
              checked={rememberScrollPosition}
              onCheckedChange={onRememberScrollPositionChange}
              aria-label="记住滚动位置开关"
            />
          </Field>

          <Separator />

          <Field className="flex flex-row items-center justify-between gap-4">
            <div>
              <FieldTitle>实时延迟显示</FieldTitle>
              <FieldDescription>
                开启后，搜索结果中的延迟数值会每 5 秒更新一次
              </FieldDescription>
            </div>
            <Switch
              id="realtime-latency"
              checked={realtimeLatency}
              onCheckedChange={onRealtimeLatencyChange}
              aria-label="实时延迟显示开关"
            />
          </Field>

          <Separator />

          <Field>
            <FieldTitle>搜索结果显示方式</FieldTitle>
            <FieldDescription>选择搜索结果的展示模式</FieldDescription>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {DISPLAY_MODES.map(({ value, label, description }) => {
                const isSelected = searchDisplayMode === value
                return (
                  <button
                    key={value}
                    onClick={() => onSearchDisplayModeChange(value)}
                    className={cn(
                      'px-4 py-3 rounded-lg border text-left transition-all duration-200 cursor-pointer',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-muted border-border hover:border-primary hover:bg-muted/80',
                    )}
                  >
                    <div className="text-sm font-semibold">{label}</div>
                    <div
                      className={cn(
                        'text-xs mt-1',
                        isSelected
                          ? 'text-primary-foreground/80'
                          : 'text-muted-foreground',
                      )}
                    >
                      {description}
                    </div>
                  </button>
                )
              })}
            </div>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
