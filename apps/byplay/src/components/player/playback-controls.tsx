'use client'

import { Button } from '@cdlab996/ui/components/button'
import { ButtonGroup } from '@cdlab996/ui/components/button-group'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Input } from '@cdlab996/ui/components/input'

interface PlaybackControlsProps {
  isPlaying: boolean
  speed: string
  seekTime: string
  onSetSpeed: (speed: string) => void
  onSetSeekTime: (time: string) => void
  onLoad: () => void
  onToggle: () => void
  onStop: () => void
  onDestroy: () => void
  onSetPlayerSpeed: () => void
  onSeek: () => void
  onRestart: () => void
  onSwitchNext: () => void
}

export function PlaybackControls({
  isPlaying,
  speed,
  seekTime,
  onSetSpeed,
  onSetSeekTime,
  onLoad,
  onToggle,
  onStop,
  onDestroy,
  onSetPlayerSpeed,
  onSeek,
  onRestart,
  onSwitchNext,
}: PlaybackControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>播放控制</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Row 1: Main control buttons - equal width, full spread */}
        <ButtonGroup className="w-full">
          <Button
            onClick={onLoad}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            加载
          </Button>
          <Button
            onClick={onToggle}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            {isPlaying ? '暂停' : '播放'}
          </Button>
          <Button
            onClick={onStop}
            className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
          >
            停止
          </Button>
          <Button
            onClick={onDestroy}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
          >
            销毁
          </Button>
        </ButtonGroup>

        {/* Row 2: Speed input + action */}
        <ButtonGroup className="w-full">
          <Input
            value={speed}
            onChange={(e) => onSetSpeed(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSetPlayerSpeed()}
            placeholder="播放速度 (0-16]"
            className="flex-1"
          />
          <Button
            onClick={onSetPlayerSpeed}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 whitespace-nowrap"
          >
            设置倍速
          </Button>
        </ButtonGroup>

        {/* Row 3: Seek input + action */}
        <ButtonGroup className="w-full">
          <Input
            value={seekTime}
            onChange={(e) => onSetSeekTime(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSeek()}
            placeholder="时间点(秒)"
            className="flex-1"
          />
          <Button
            onClick={onSeek}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 whitespace-nowrap"
          >
            跳转
          </Button>
        </ButtonGroup>

        {/* Row 4: Restart and Switch - equal width, full spread */}
        <ButtonGroup className="w-full">
          <Button
            onClick={onRestart}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800"
          >
            重启当前播放器
          </Button>
          <Button
            onClick={onSwitchNext}
            className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
          >
            切换至下一个播放源
          </Button>
        </ButtonGroup>
      </CardContent>
    </Card>
  )
}
