'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@cdlab996/ui/components/card'
import { Separator } from '@cdlab996/ui/components/separator'
import { GlobeIcon, MaximizeIcon, MonitorPlayIcon } from 'lucide-react'
import type { PlayerEngine, ProxyMode } from '@/lib/store/settings-store'

interface PlayerSettingsProps {
  fullscreenType: 'native' | 'window'
  onFullscreenTypeChange: (type: 'native' | 'window') => void
  proxyMode: ProxyMode
  onProxyModeChange: (mode: ProxyMode) => void
  playerEngine: PlayerEngine
  onPlayerEngineChange: (engine: PlayerEngine) => void
}

export function PlayerSettings({
  fullscreenType,
  onFullscreenTypeChange,
  proxyMode,
  onProxyModeChange,
  playerEngine,
  onPlayerEngineChange,
}: PlayerSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>播放器设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Player Engine */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MonitorPlayIcon className="size-4 text-muted-foreground" />
            <span className="font-medium text-sm">播放引擎</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            VePlayer 功能丰富，原生播放器兼容性更好
          </p>
          <div className="flex gap-2">
            <Button
              variant={playerEngine === 'veplayer' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPlayerEngineChange('veplayer')}
            >
              VePlayer
            </Button>
            <Button
              variant={playerEngine === 'native' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPlayerEngineChange('native')}
            >
              原生播放器
            </Button>
          </div>
        </div>

        <Separator />

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

      </CardContent>
    </Card>
  )
}
