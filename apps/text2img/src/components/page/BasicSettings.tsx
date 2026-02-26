import { Dices } from 'lucide-react'
import Image from 'next/image'
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
        <CardTitle>基础设置</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" onClick={handleRandomPrompt}>
            <Dices className="size-4" />
            随机提示词
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">访问密码</Label>
          <PasswordInput
            id="password"
            placeholder="请输入访问密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            toggleAriaLabel="切换密码显示"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt">正向提示词</Label>
          <Textarea
            id="prompt"
            rows={3}
            placeholder="描述您想要生成的图像内容及样式..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="negative_prompt">反向提示词</Label>
          <Textarea
            id="negative_prompt"
            rows={2}
            placeholder="描述在生成的图像中要避免的元素文本..."
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">模型</Label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择模型">
                <div className="flex items-center gap-2">
                  {selectedModelData ? selectedModelData.name : '选择模型'}
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
                        <span className="font-medium">{model.name}</span>
                        {model.description && (
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {model.description}
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
