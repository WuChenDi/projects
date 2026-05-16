'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Separator } from '@cdlab996/ui/components/separator'
import { Textarea } from '@cdlab996/ui/components/textarea'
import { GlobeIcon, MaximizeIcon, ShieldIcon } from 'lucide-react'
import type { AdFilterMode, ProxyMode } from '@/lib/store/settings-store'

interface PlayerSettingsProps {
  fullscreenType: 'native' | 'window'
  onFullscreenTypeChange: (type: 'native' | 'window') => void
  proxyMode: ProxyMode
  onProxyModeChange: (mode: ProxyMode) => void
  adFilterMode: AdFilterMode
  adKeywords: string[]
  onAdFilterModeChange: (mode: AdFilterMode) => void
  onAdKeywordsChange: (keywords: string[]) => void
}

const AD_FILTER_MODES: { value: AdFilterMode; label: string; desc: string }[] =
  [
    { value: 'off', label: '关闭', desc: '不过滤广告' },
    { value: 'keyword', label: '关键词', desc: '仅根据自定义关键词过滤' },
    {
      value: 'heuristic',
      label: '启发式',
      desc: '自动分析播放列表结构识别广告（推荐）',
    },
    {
      value: 'aggressive',
      label: '激进',
      desc: '更严格的启发式检测，可能误删正常片段',
    },
  ]

export function PlayerSettings({
  fullscreenType,
  onFullscreenTypeChange,
  proxyMode,
  onProxyModeChange,
  adFilterMode,
  adKeywords,
  onAdFilterModeChange,
  onAdKeywordsChange,
}: PlayerSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>播放器设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Fullscreen Mode */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MaximizeIcon className="size-4 text-muted-foreground" />
            <span className="font-medium text-sm">默认全屏方式</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            选择在桌面端点击播放器全屏按钮时的行为
          </p>
          <div className="flex gap-2">
            <Button
              variant={fullscreenType === 'native' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFullscreenTypeChange('native')}
            >
              系统全屏
            </Button>
            <Button
              variant={fullscreenType === 'window' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFullscreenTypeChange('window')}
            >
              网页全屏
            </Button>
          </div>
        </div>

        <Separator />

        {/* Proxy Mode */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GlobeIcon className="size-4 text-muted-foreground" />
            <span className="font-medium text-sm">代理播放模式</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            控制视频播放时的网络请求策略
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={proxyMode === 'retry' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onProxyModeChange('retry')}
            >
              智能重试（推荐）
            </Button>
            <Button
              variant={proxyMode === 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onProxyModeChange('none')}
            >
              仅直连
            </Button>
            <Button
              variant={proxyMode === 'always' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onProxyModeChange('always')}
            >
              总是代理
            </Button>
          </div>
        </div>

        <Separator />

        {/* Ad Filter */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldIcon className="size-4 text-muted-foreground" />
            <span className="font-medium text-sm">广告过滤</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            过滤 M3U8 播放流中的广告片段
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {AD_FILTER_MODES.map(({ value, label, desc }) => (
              <Button
                key={value}
                variant={adFilterMode === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onAdFilterModeChange(value)}
                title={desc}
              >
                {label}
              </Button>
            ))}
          </div>
          {adFilterMode !== 'off' && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                自定义关键词（每行一个，URL 中包含关键词的片段将被过滤）
              </p>
              <Textarea
                className="font-mono text-xs min-h-24 resize-none"
                placeholder={'ad\ncommercial\npreroll'}
                value={adKeywords.join('\n')}
                onChange={(e) =>
                  onAdKeywordsChange(
                    e.target.value.split('\n').filter((k) => k.trim()),
                  )
                }
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
