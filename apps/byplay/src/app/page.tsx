'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { ScrollArea } from '@cdlab996/ui/components/scroll-area'
import { Textarea } from '@cdlab996/ui/components/textarea'
import { IKPageContainer } from '@cdlab996/ui/IK'
import Script from 'next/script'
import {
  AdvancedConfig,
  PlaybackControls,
  VideoDisplay,
} from '@/components/player'
import { useVideoPlayer } from '@/hooks/use-video-player'

export default function App() {
  const player = useVideoPlayer()

  return (
    <IKPageContainer
      scrollable={false}
      className="flex-1 grid gap-4 lg:grid-cols-[clamp(440px,37%,600px)_1fr]"
    >
      <ScrollArea className="order-2 lg:order-1 lg:h-[calc(100dvh-170px)]">
        <div className="space-y-5 pb-4">
          <Card>
            <CardHeader>
              <CardTitle>播放地址</CardTitle>
              <CardDescription>
                请输入视频播放地址，支持 MP4、M3U8、FLV 等多种格式...
                (多个链接请换行)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={5}
                value={player.urls}
                onChange={(e) => player.setUrls(e.target.value)}
                placeholder="请输入视频播放地址，支持 MP4、M3U8、FLV 等多种格式... (多个链接请换行)"
                className="break-all resize-none"
              />
            </CardContent>
          </Card>

          <PlaybackControls
            isPlaying={player.isPlaying}
            speed={player.speed}
            seekTime={player.seekTime}
            onSetSpeed={player.setSpeed}
            onSetSeekTime={player.setSeekTime}
            onLoad={player.load}
            onToggle={player.toggle}
            onStop={player.stop}
            onDestroy={player.destroy}
            onSetPlayerSpeed={player.setPlayerSpeed}
            onSeek={player.seek}
            onRestart={player.restart}
            onSwitchNext={player.switchNext}
          />

          <AdvancedConfig
            restartTimeout={player.restartTimeout}
            hlsLoadPolicy={player.hlsLoadPolicy}
            flvLowLatency={player.flvLowLatency}
            hlsLowLatency={player.hlsLowLatency}
            onSetRestartTimeout={player.setRestartTimeout}
            onSetHlsLoadPolicy={player.setHlsLoadPolicy}
            onSetFlvLowLatency={player.setFlvLowLatency}
            onSetHlsLowLatency={player.setHlsLowLatency}
          />
        </div>
      </ScrollArea>

      <div className="order-1 lg:order-2 min-h-[240px]">
        <VideoDisplay videoRef={player.videoRef} />
      </div>

      <Script
        src="/vplayer.js"
        strategy="beforeInteractive"
        onReady={player.onScriptReady}
      />
    </IKPageContainer>
  )
}
