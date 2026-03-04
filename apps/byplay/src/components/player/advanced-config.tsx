'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@cdlab996/ui/components/accordion'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Field, FieldGroup, FieldLabel } from '@cdlab996/ui/components/field'
import { Input } from '@cdlab996/ui/components/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@cdlab996/ui/components/input-group'
import { Label } from '@cdlab996/ui/components/label'
import { Switch } from '@cdlab996/ui/components/switch'
import { useCallback, useEffect, useState } from 'react'
import type {
  FlvLowLatencyConfig,
  HlsLoadPolicyConfig,
  HlsLowLatencyConfig,
} from '@/hooks/use-video-player'

interface AdvancedConfigProps {
  restartTimeout: string
  hlsLoadPolicy: HlsLoadPolicyConfig
  flvLowLatency: FlvLowLatencyConfig
  hlsLowLatency: HlsLowLatencyConfig
  onSetRestartTimeout: (value: string) => void
  onSetHlsLoadPolicy: (config: HlsLoadPolicyConfig) => void
  onSetFlvLowLatency: (config: FlvLowLatencyConfig) => void
  onSetHlsLowLatency: (config: HlsLowLatencyConfig) => void
}

function ConfigField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}

export function AdvancedConfig({
  restartTimeout,
  hlsLoadPolicy,
  flvLowLatency,
  hlsLowLatency,
  onSetRestartTimeout,
  onSetHlsLoadPolicy,
  onSetFlvLowLatency,
  onSetHlsLowLatency,
}: AdvancedConfigProps) {
  const [vConsoleEnabled, setVConsoleEnabled] = useState(false)

  useEffect(() => {
    setVConsoleEnabled(localStorage.getItem('vConsoleEnabled') === 'true')
  }, [])

  const toggleVConsole = useCallback(async (enabled: boolean) => {
    setVConsoleEnabled(enabled)
    if (enabled) {
      const VConsole = (await import('vconsole')).default
      const instance = new VConsole()
      ;(window as unknown as Record<string, unknown>).__vConsoleInstance =
        instance
      localStorage.setItem('vConsoleEnabled', 'true')
    } else {
      const instance = (window as unknown as Record<string, unknown>)
        .__vConsoleInstance as { destroy: () => void } | undefined
      instance?.destroy()
      ;(window as unknown as Record<string, unknown>).__vConsoleInstance = null
      localStorage.setItem('vConsoleEnabled', 'false')
    }
  }, [])

  const updateHlsPolicy = useCallback(
    (key: keyof HlsLoadPolicyConfig, value: string) => {
      onSetHlsLoadPolicy({ ...hlsLoadPolicy, [key]: value })
    },
    [hlsLoadPolicy, onSetHlsLoadPolicy],
  )

  const updateFlvConfig = useCallback(
    (key: keyof FlvLowLatencyConfig, value: string | boolean) => {
      onSetFlvLowLatency({ ...flvLowLatency, [key]: value })
    },
    [flvLowLatency, onSetFlvLowLatency],
  )

  const updateHlsLowLatency = useCallback(
    (key: keyof HlsLowLatencyConfig, value: string | boolean) => {
      onSetHlsLowLatency({ ...hlsLowLatency, [key]: value })
    },
    [hlsLowLatency, onSetHlsLowLatency],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>高级配置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Restart Timeout */}
        <div className="p-4 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-100 dark:border-blue-800">
          <Label className="text-sm font-semibold mb-1">
            暂停恢复重启超时时间
          </Label>
          <p className="text-xs text-muted-foreground mb-3">
            修改后点击"加载"按钮生效
          </p>
          <InputGroup>
            <InputGroupInput
              value={restartTimeout}
              onChange={(e) => onSetRestartTimeout(e.target.value)}
              type="number"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>ms</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </div>

        {/* VConsole Toggle */}
        <div className="flex items-center justify-between px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all">
          <Label htmlFor="vconsole-switch">VConsole 调试控制台</Label>
          <Switch
            id="vconsole-switch"
            checked={vConsoleEnabled}
            onCheckedChange={toggleVConsole}
          />
        </div>

        {/* Accordion configs */}
        <Accordion type="multiple" className="space-y-3">
          {/* HLS Load Policy */}
          <AccordionItem
            value="hls-load-policy"
            className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
          >
            <AccordionTrigger className="px-4 py-3">
              HLS 加载策略配置
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-4">
              <Button
                onClick={() => onSetHlsLoadPolicy(hlsLoadPolicy)}
                className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                应用 HLS 配置
              </Button>
              <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ConfigField
                  label="Level Loading Timeout"
                  value={hlsLoadPolicy.levelLoadingTimeOut}
                  onChange={(v) => updateHlsPolicy('levelLoadingTimeOut', v)}
                />
                <ConfigField
                  label="Level Loading Max Retry"
                  value={hlsLoadPolicy.levelLoadingMaxRetry}
                  onChange={(v) => updateHlsPolicy('levelLoadingMaxRetry', v)}
                />
                <ConfigField
                  label="Level Loading Retry Delay"
                  value={hlsLoadPolicy.levelLoadingRetryDelay}
                  onChange={(v) => updateHlsPolicy('levelLoadingRetryDelay', v)}
                />
                <ConfigField
                  label="Level Loading Max Retry Timeout"
                  value={hlsLoadPolicy.levelLoadingMaxRetryTimeout}
                  onChange={(v) =>
                    updateHlsPolicy('levelLoadingMaxRetryTimeout', v)
                  }
                />
                <ConfigField
                  label="Manifest Loading Timeout"
                  value={hlsLoadPolicy.manifestLoadingTimeOut}
                  onChange={(v) => updateHlsPolicy('manifestLoadingTimeOut', v)}
                />
                <ConfigField
                  label="Manifest Loading Max Retry"
                  value={hlsLoadPolicy.manifestLoadingMaxRetry}
                  onChange={(v) =>
                    updateHlsPolicy('manifestLoadingMaxRetry', v)
                  }
                />
                <ConfigField
                  label="Manifest Loading Retry Delay"
                  value={hlsLoadPolicy.manifestLoadingRetryDelay}
                  onChange={(v) =>
                    updateHlsPolicy('manifestLoadingRetryDelay', v)
                  }
                />
                <ConfigField
                  label="Manifest Loading Max Retry Timeout"
                  value={hlsLoadPolicy.manifestLoadingMaxRetryTimeout}
                  onChange={(v) =>
                    updateHlsPolicy('manifestLoadingMaxRetryTimeout', v)
                  }
                />
                <ConfigField
                  label="Frag Loading Timeout"
                  value={hlsLoadPolicy.fragLoadingTimeOut}
                  onChange={(v) => updateHlsPolicy('fragLoadingTimeOut', v)}
                />
                <ConfigField
                  label="Frag Loading Max Retry"
                  value={hlsLoadPolicy.fragLoadingMaxRetry}
                  onChange={(v) => updateHlsPolicy('fragLoadingMaxRetry', v)}
                />
                <ConfigField
                  label="Frag Loading Retry Delay"
                  value={hlsLoadPolicy.fragLoadingRetryDelay}
                  onChange={(v) => updateHlsPolicy('fragLoadingRetryDelay', v)}
                />
                <ConfigField
                  label="Frag Loading Max Retry Timeout"
                  value={hlsLoadPolicy.fragLoadingMaxRetryTimeout}
                  onChange={(v) =>
                    updateHlsPolicy('fragLoadingMaxRetryTimeout', v)
                  }
                />
              </FieldGroup>
            </AccordionContent>
          </AccordionItem>

          {/* FLV Low Latency */}
          <AccordionItem
            value="flv-low-latency"
            className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
          >
            <AccordionTrigger className="px-4 py-3">
              FLV 超低延迟配置
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-4">
              <Button
                onClick={() => onSetFlvLowLatency(flvLowLatency)}
                className="w-full bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                应用 FLV 配置
              </Button>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="flv-enable-switch">功能开关</FieldLabel>
                  <Switch
                    id="flv-enable-switch"
                    checked={flvLowLatency.enable}
                    onCheckedChange={(v) => updateFlvConfig('enable', v)}
                  />
                </div>
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ConfigField
                  label="最大目标缓存时长"
                  value={flvLowLatency.maxTargetBufferToPlay}
                  onChange={(v) => updateFlvConfig('maxTargetBufferToPlay', v)}
                />
                <ConfigField
                  label="最小目标缓存时长"
                  value={flvLowLatency.minTargetBufferToPlay}
                  onChange={(v) => updateFlvConfig('minTargetBufferToPlay', v)}
                />
                <ConfigField
                  label="预期调整时间"
                  value={flvLowLatency.expectedAdjustmentTime}
                  onChange={(v) => updateFlvConfig('expectedAdjustmentTime', v)}
                />
                <ConfigField
                  label="最大播放速率"
                  value={flvLowLatency.maxPlaybackRate}
                  onChange={(v) => updateFlvConfig('maxPlaybackRate', v)}
                />
                <ConfigField
                  label="常速到加速最小间隔"
                  value={flvLowLatency.minIntervalTimeFromNormalToAccelerated}
                  onChange={(v) =>
                    updateFlvConfig('minIntervalTimeFromNormalToAccelerated', v)
                  }
                />
                <ConfigField
                  label="最大加速次数周期"
                  value={flvLowLatency.minPeriodTimeOfMaxCountOfAcceleration}
                  onChange={(v) =>
                    updateFlvConfig('minPeriodTimeOfMaxCountOfAcceleration', v)
                  }
                />
                <ConfigField
                  label="周期内最大加速次数"
                  value={flvLowLatency.maxCountOfAccelerationInPeriodTime}
                  onChange={(v) =>
                    updateFlvConfig('maxCountOfAccelerationInPeriodTime', v)
                  }
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* HLS Low Latency */}
          <AccordionItem
            value="hls-low-latency"
            className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-teal-300 dark:hover:border-teal-600 transition-colors"
          >
            <AccordionTrigger className="px-4 py-3">
              HLS 超低延迟配置
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-4">
              <Button
                onClick={() => onSetHlsLowLatency(hlsLowLatency)}
                className="w-full bg-linear-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
              >
                应用 HLS 超低延迟配置
              </Button>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="hls-enable-switch">功能开关</FieldLabel>
                  <Switch
                    id="hls-enable-switch"
                    checked={hlsLowLatency.enable}
                    onCheckedChange={(v) => updateHlsLowLatency('enable', v)}
                  />
                </div>
              </Field>
              <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ConfigField
                  label="滑动窗口初始值 (TS个数)"
                  value={hlsLowLatency.tsCheckWindowInit}
                  onChange={(v) => updateHlsLowLatency('tsCheckWindowInit', v)}
                />
                <ConfigField
                  label="滑动窗口最大值 (TS个数)"
                  value={hlsLowLatency.tsCheckWindowMax}
                  onChange={(v) => updateHlsLowLatency('tsCheckWindowMax', v)}
                />
                <ConfigField
                  label="滑动窗口步长 (TS个数)"
                  value={hlsLowLatency.tsCheckWindowStep}
                  onChange={(v) => updateHlsLowLatency('tsCheckWindowStep', v)}
                />
                <ConfigField
                  label="最大播放速率"
                  value={hlsLowLatency.maxPlaybackRate}
                  onChange={(v) => updateHlsLowLatency('maxPlaybackRate', v)}
                />
                <ConfigField
                  label="最小播放速率"
                  value={hlsLowLatency.minPlaybackRate}
                  onChange={(v) => updateHlsLowLatency('minPlaybackRate', v)}
                />
                <ConfigField
                  label="慢下载阈值 (秒)"
                  value={hlsLowLatency.slowDownloadToNowThreshold}
                  onChange={(v) =>
                    updateHlsLowLatency('slowDownloadToNowThreshold', v)
                  }
                />
              </FieldGroup>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
