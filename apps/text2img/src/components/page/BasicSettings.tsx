import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Label } from '@cdlab996/ui/components/label'
import { PasswordInput } from '@cdlab996/ui/components/password-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cdlab996/ui/components/select'
import { Textarea } from '@cdlab996/ui/components/textarea'
import { Dices } from 'lucide-react'
import type { Model } from '@/types'

interface BasicSettingsProps {
  models: Model[] | undefined
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
  models,
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
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">基本设置</CardTitle>
          <Button variant="outline" size="sm" onClick={handleRandomPrompt}>
            <Dices className="size-4" />
            随机提示词
          </Button>
        </div>
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
                  {selectedModel
                    ? models?.find((m) => m.id === selectedModel)?.name
                    : '选择模型'}
                </div>
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {models?.map((model) => (
                <SelectItem key={model.id} value={model.id}>
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
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
