import { Dices } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Label } from '@cdlab996/ui/components/label'
import { PasswordInput } from '@cdlab996/ui/components/password-input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@cdlab996/ui/components/select'
import { Textarea } from '@cdlab996/ui/components/textarea'
import type { ModelGroup } from '@/types'

interface BasicSettingsProps {
  modelGroups: ModelGroup[] | undefined
  password: string
  setPassword: (password: string) => void
  prompt: string
  setPrompt: (prompt: string) => void
  negativePrompt: string
  setNegativePrompt: (negativePrompt: string) => void
  selectedModel: string
  setSelectedModel: (model: string) => void
  handleRandomPrompt: () => void
}

export function BasicSettings({
  modelGroups,
  password,
  setPassword,
  prompt,
  setPrompt,
  negativePrompt,
  setNegativePrompt,
  selectedModel,
  setSelectedModel,
  handleRandomPrompt,
}: BasicSettingsProps) {
  const t = useTranslations()

  const findSelectedModel = () => {
    if (!modelGroups || !selectedModel) return null
    for (const group of modelGroups) {
      const model = group.models.find((m) => m.id === selectedModel)
      if (model) return model
    }
    return null
  }

  const selectedModelData = findSelectedModel()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('basic.title')}</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" onClick={handleRandomPrompt}>
            <Dices className="size-4" />
            {t('basic.randomPrompt')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">{t('basic.password')}</Label>
          <PasswordInput
            id="password"
            placeholder={t('basic.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            toggleAriaLabel={t('basic.passwordToggle')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt">{t('basic.prompt')}</Label>
          <Textarea
            id="prompt"
            rows={3}
            placeholder={t('basic.promptPlaceholder')}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="negative_prompt">{t('basic.negativePrompt')}</Label>
          <Textarea
            id="negative_prompt"
            rows={2}
            placeholder={t('basic.negativePromptPlaceholder')}
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">{t('basic.model')}</Label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('basic.selectModel')}>
                <div className="flex items-center gap-2">
                  {selectedModelData ? selectedModelData.name : t('basic.selectModel')}
                </div>
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {modelGroups?.map((group) => (
                <SelectGroup key={group.id}>
                  <SelectLabel className="flex items-center gap-2">
                    {group.image && (
                      <div className="relative w-4 h-4 shrink-0">
                        <Image
                          src={group.image}
                          alt={`${group.name}`}
                          fill
                          sizes="16px"
                          className="object-contain"
                        />
                      </div>
                    )}
                    {group.name}
                  </SelectLabel>
                  {group.models.map((model) => (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      disabled={model.disabled}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-1.5">
                          {model.name}
                          {model.type !== 'text2img' && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">
                              {t(`modelType.${model.type}`)}
                            </Badge>
                          )}
                        </span>
                        {model.description && (
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {t(`models.${model.id}`)}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
