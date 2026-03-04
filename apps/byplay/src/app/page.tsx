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
    <IKPageContainer scrollable={false}>
      <Script
        src="/vplayer.js"
        strategy="beforeInteractive"
        onReady={player.onScriptReady}
      />

      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        <ScrollArea>
          <div className="space-y-4 pr-2 pb-4">
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
                  className="break-all"
                />
              </CardContent>
            </Card>
            {/* Playback Controls */}
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

            {/* Advanced Config */}
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

        <div className="flex flex-col gap-4">
          <VideoDisplay videoRef={player.videoRef} />
        </div>
      </div>
    </IKPageContainer>
  )
}
