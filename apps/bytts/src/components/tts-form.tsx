'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Cascader } from '@cdlab996/ui/components/cascader'
import { Field, FieldGroup, FieldTitle } from '@cdlab996/ui/components/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@cdlab996/ui/components/input-group'
import { Label } from '@cdlab996/ui/components/label'
import { Slider } from '@cdlab996/ui/components/slider'
import { StatusEnum } from '@cdlab996/ui/IK'
import { copyToClipboard } from '@cdlab996/utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ClipboardPaste, Copy, Loader2, Timer, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { genid } from '@/lib/genid'
import { escapeXml, splitText } from '@/lib/utils'
import { useHistoryStore } from '@/store/useHistoryStore'

interface SpeakerConfig {
  [key: string]: { speakers: Record<string, string> }
}
export default function TTSForm() {
  const [speaker, setSpeaker] = useState('')
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [rate, setRate] = useState(0)
  const [pitch, setPitch] = useState(0)
  const [pauseSeconds, setPauseSeconds] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)

  const { addHistory, updateHistory } = useHistoryStore()

  const { data: speakersData, isError: isSpeakersError } =
    useQuery<SpeakerConfig>({
      queryKey: ['speakers'],
      queryFn: async () => {
        const res = await fetch('/speakers.json')
        if (!res.ok) throw new Error('Failed to load speakers')
        return res.json()
      },
    })

  const speakers = speakersData ?? {}

  useEffect(() => {
    if (isSpeakersError) {
      toast.error('加载讲述者失败，请刷新页面重试。')
    }
  }, [isSpeakersError])

  useEffect(() => {
    if (speakersData?.['edge-api']?.speakers && !speaker) {
      setSpeaker(Object.keys(speakersData['edge-api'].speakers)[0] || '')
    }
  }, [speakersData, speaker])

  const { mutateAsync: ttsRequest } = useMutation({
    mutationFn: async ({
      text,
      speakerId,
      isPreview,
      rate,
      pitch,
    }: {
      text: string
      speakerId: string
      isPreview: boolean
      rate: number
      pitch: number
    }) => {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { Accept: 'audio/mpeg', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: escapeXml(text),
          voice: speakerId,
          rate,
          pitch,
          preview: isPreview,
        }),
      })
      if (!response.ok) throw new Error(`服务器响应错误: ${response.status}`)
      const blob = await response.blob()
      if (!blob.type.includes('audio/') || blob.size === 0)
        throw new Error('Invalid audio file!')
      return blob
    },
  })

  const groupSpeakers = (speakersObj: Record<string, string>) => {
    const groups: Record<string, [string, string][]> = {}
    Object.entries(speakersObj).forEach(([key, value]) => {
      const match = key.match(/^([a-z]{2,3}-[A-Z]{2,3})/)
      const group = match ? match[1] : '其他'
      if (!groups[group]) groups[group] = []
      groups[group].push([key, value])
    })
    return groups
  }

  const handleCopy = async () => {
    const success = await copyToClipboard(text)
    if (success) {
      toast.success('已复制到剪贴板')
    } else {
      toast.error('复制失败')
    }
  }

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText()
      const textarea = document.getElementById('text') as HTMLTextAreaElement
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      setText(text.substring(0, start) + clipText + text.substring(end))
    } catch {
      toast.error('无法读取剪贴板')
    }
  }

  const handleInsertPause = () => {
    if (isNaN(pauseSeconds) || pauseSeconds < 0.01 || pauseSeconds > 100) {
      toast.error('请输入0.01到100之间的数字')
      return
    }
    const textarea = document.getElementById('text') as HTMLTextAreaElement
    const cursorPos = textarea.selectionStart
    setText(
      text.substring(0, cursorPos) +
        `<break time="${pauseSeconds}s"/>` +
        text.substring(textarea.selectionEnd),
    )
  }

  const generateVoice = async (isPreview: boolean) => {
    if (isGenerating) {
      toast.error('请等待当前语音生成完成')
      return
    }
    if (!text.trim()) {
      toast.error('请输入要转换的文本')
      return
    }

    setIsGenerating(true)
    const segments = isPreview ? [text.substring(0, 20)] : splitText(text)
    const requestId = String(genid.nextId())

    if (!isPreview) {
      addHistory({
        id: requestId,
        name: name.trim() || undefined,
        timestamp: new Date().toLocaleString(),
        speaker: speakers['edge-api']?.speakers?.[speaker] || speaker,
        text,
        requestInfo: 'edge-api',
        status: StatusEnum.PROCESSING,
      })
    }

    try {
      if (segments.length > 1) {
        toast.info(`正在生成#${requestId}请求的 1/${segments.length} 段语音...`)
        const blobs: Blob[] = []
        for (let i = 0; i < segments.length; i++) {
          const blob = await ttsRequest({
            text: segments[i],
            speakerId: speaker,
            isPreview,
            rate,
            pitch,
          })
          blobs.push(blob)
          toast.info(
            `正在生成#${requestId}请求的 ${i + 1}/${segments.length} 段语音...`,
          )
        }
        const merged = new Blob(blobs, { type: 'audio/mpeg' })
        if (!isPreview) {
          updateHistory(requestId, {
            status: StatusEnum.COMPLETED,
            audioBlob: merged,
          })
        }
      } else {
        toast.info(`正在生成#${requestId}请求的语音...`)
        const blob = await ttsRequest({
          text: segments[0],
          speakerId: speaker,
          isPreview,
          rate,
          pitch,
        })
        if (isPreview) {
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          audio.onended = () => URL.revokeObjectURL(url)
          audio.play()
        } else {
          updateHistory(requestId, {
            status: StatusEnum.COMPLETED,
            audioBlob: blob,
          })
        }
      }
    } catch (error) {
      const message = (error as Error).message
      toast.error(`生成失败：${message}`)
      if (!isPreview) {
        updateHistory(requestId, { status: StatusEnum.FAILED, error: message })
      }
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>文本转语音</CardTitle>
        <CardDescription>输入文本，选择讲述者，生成语音</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <Label>选择语音</Label>
            <Cascader
              placeholder="选择语音"
              className="w-full"
              allowClear={false}
              value={
                speaker
                  ? [
                      speaker.match(/^([a-z]{2,3}-[A-Z]{2,3})/)?.[1] ?? '其他',
                      speaker,
                    ]
                  : []
              }
              options={
                speakers['edge-api']?.speakers
                  ? Object.entries(
                      groupSpeakers(speakers['edge-api'].speakers),
                    ).map(([group, items]) => ({
                      value: group,
                      label: group,
                      children: items.map(([key, value]) => ({
                        value: key,
                        label: value,
                      })),
                    }))
                  : []
              }
              onChange={([, speakerKey]) => {
                if (speakerKey) setSpeaker(speakerKey)
              }}
            />
          </Field>
          <Field>
            <Label>自定义名称</Label>
            <InputGroup>
              <InputGroupInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`留空则默认使用文件名`}
                maxLength={100}
              />
            </InputGroup>
          </Field>

          <Field>
            <Label>输入文本</Label>
            <InputGroup className="h-auto flex-col">
              <InputGroupAddon
                align="block-start"
                className="border-b justify-end"
              >
                <InputGroupButton
                  size="icon-xs"
                  variant="ghost"
                  onClick={handlePaste}
                  title="粘贴"
                >
                  <ClipboardPaste />
                </InputGroupButton>
                <InputGroupButton
                  size="icon-xs"
                  variant="ghost"
                  onClick={handleCopy}
                  disabled={!text}
                  title="复制"
                >
                  <Copy />
                </InputGroupButton>
                <InputGroupButton
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setText('')}
                  disabled={!text}
                  title="清空"
                >
                  <Trash2 />
                </InputGroupButton>
              </InputGroupAddon>

              <InputGroupTextarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                maxLength={50000}
                placeholder="请输入要转换的文本"
                className="min-h-[120px] bg-card/50"
              />
              <InputGroupAddon align="block-end" className="border-t">
                <InputGroupText className="text-xs text-muted-foreground">
                  {text.length} / 50000 字符，长文本将自动分段
                </InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Field>
            <div className="flex justify-between items-center">
              <FieldTitle>停顿</FieldTitle>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm tabular-nums">
                  {pauseSeconds ? `${pauseSeconds}秒` : '0秒'}
                </span>
                <Button variant="outline" size="sm" onClick={handleInsertPause}>
                  <Timer className="size-3.5" />
                  插入
                </Button>
              </div>
            </div>
            <Slider
              value={[pauseSeconds]}
              onValueChange={([value]) => setPauseSeconds(value)}
              min={0}
              max={10}
              step={1}
            />
          </Field>

          <Field>
            <div className="flex justify-between">
              <FieldTitle>语速</FieldTitle>
              <span className="text-muted-foreground text-sm tabular-nums">
                {rate}
              </span>
            </div>
            <Slider
              value={[rate]}
              onValueChange={([value]) => setRate(value)}
              min={-100}
              max={100}
              step={1}
            />
          </Field>

          <Field>
            <div className="flex justify-between">
              <FieldTitle>语调</FieldTitle>
              <span className="text-muted-foreground text-sm tabular-nums">
                {pitch}
              </span>
            </div>
            <Slider
              value={[pitch]}
              onValueChange={([value]) => setPitch(value)}
              min={-100}
              max={100}
              step={1}
            />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <div className="flex flex-row gap-2 w-full">
          {isGenerating ? (
            <Button disabled className="flex-1">
              <Loader2 className="animate-spin" />
              正在生成语音，请稍候...
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => generateVoice(true)}
                className="flex-1"
              >
                试听前20个字
              </Button>
              <Button onClick={() => generateVoice(false)} className="flex-1">
                生成语音
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
