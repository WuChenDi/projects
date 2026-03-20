'use client'

import { Input } from '@cdlab996/ui/components/input'
import { Label } from '@cdlab996/ui/components/label'
import { Switch } from '@cdlab996/ui/components/switch'
import { useTranslations } from 'next-intl'
import { useAgentStore } from '@/stores/agent-store'

export function AgentSettings() {
  const t = useTranslations()
  const config = useAgentStore((s) => s.config)
  const autoMode = useAgentStore((s) => s.autoMode)
  const setConfig = useAgentStore((s) => s.setConfig)
  const setAutoMode = useAgentStore((s) => s.setAutoMode)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="agent-base-url">{t("ai.apiBaseUrl")}</Label>
        <Input
          id="agent-base-url"
          placeholder="https://api.openai.com/v1"
          value={config.baseUrl}
          onChange={(event) => setConfig({ baseUrl: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="agent-api-key">{t("ai.apiKey")}</Label>
        <Input
          id="agent-api-key"
          type="password"
          placeholder="sk-..."
          value={config.apiKey}
          onChange={(event) => setConfig({ apiKey: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="agent-model">{t("common.model")}</Label>
        <Input
          id="agent-model"
          placeholder="gpt-5.2"
          value={config.model}
          onChange={(event) => setConfig({ model: event.target.value })}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="agent-auto-mode">{t("agent.autoMode")}</Label>
          <p className="text-muted-foreground text-xs">
            {t("agent.skipConfirmation")}
          </p>
        </div>
        <Switch
          id="agent-auto-mode"
          checked={autoMode}
          onCheckedChange={setAutoMode}
        />
      </div>
    </div>
  )
}
