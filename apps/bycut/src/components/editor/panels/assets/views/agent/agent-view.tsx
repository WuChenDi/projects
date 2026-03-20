'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cdlab996/ui/components/select'
import { ArrowLeft, Trash2, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { ExpertRoleId } from '@/lib/ai/agent/expert-roles'
import { EXPERT_ROLES } from '@/lib/ai/agent/expert-roles'
import { useAgentStore } from '@/stores/agent-store'
import { AgentChat } from './agent-chat'
import { AgentInput } from './agent-input'
import { AgentSettings } from './agent-settings'

export function AgentView() {
  const t = useTranslations()
  const [showSettings, setShowSettings] = useState(false)
  const status = useAgentStore((s) => s.status)
  const config = useAgentStore((s) => s.config)
  const messages = useAgentStore((s) => s.messages)
  const sendMessage = useAgentStore((s) => s.sendMessage)
  const cancel = useAgentStore((s) => s.cancel)
  const clearMessages = useAgentStore((s) => s.clearMessages)
  const expertRole = useAgentStore((s) => s.expertRole)
  const setExpertRole = useAgentStore((s) => s.setExpertRole)
  const isBusy = status !== 'idle' && status !== 'error'

  const isConfigured = Boolean(config.apiKey)

  if (showSettings) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b p-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(false)}
            title={t("common.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{t("agent.settings")}</span>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <AgentSettings />
        </div>
      </div>
    )
  }

  if (!isConfigured) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground text-sm">
          {t("ai.configureAgentApi")}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowSettings(true)}
        >
          <Settings className="mr-2 h-4 w-4" />
          {t("ai.configureApi")}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-1.5 py-1.5">
        <Select
          value={expertRole}
          onValueChange={(value) => setExpertRole(value as ExpertRoleId)}
          disabled={isBusy}
        >
          <SelectTrigger className="h-7 w-auto text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPERT_ROLES.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                <div className="flex flex-col">
                  <span>{role.getLabel()}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex shrink-0 items-center gap-1">
          {messages.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              title={t("agent.clearChat")}
              className="h-7 w-7"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            title={t("common.settings")}
            className="h-7 w-7"
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <AgentChat />

      <AgentInput status={status} onSend={sendMessage} onCancel={cancel} />
    </div>
  )
}
