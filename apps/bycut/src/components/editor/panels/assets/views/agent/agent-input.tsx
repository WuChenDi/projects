'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Textarea } from '@cdlab996/ui/components/textarea'
import { ArrowUp, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import type { AgentStatus } from '@/lib/ai/agent/types'

interface AgentInputProps {
  status: AgentStatus
  onSend: (message: string) => void
  onCancel: () => void
}

export function AgentInput({ status, onSend, onCancel }: AgentInputProps) {
  const t = useTranslations()
  const [input, setInput] = useState('')
  const isBusy = status !== 'idle' && status !== 'error'

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || isBusy) return
    onSend(trimmed)
    setInput('')
  }, [input, isBusy, onSend])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  return (
    <div className="border-t p-3">
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("ai.prompt")}
          className="min-h-[60px] resize-none"
        />
        <div className="flex flex-col gap-1">
          {isBusy ? (
            <Button
              type="button"
              size="icon"
              variant="destructive"
              onClick={onCancel}
              title={t("common.stop")}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={handleSend}
              disabled={!input.trim()}
              title={t("common.send")}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
