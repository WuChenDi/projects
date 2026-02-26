import { Shuffle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@cdlab996/ui/components/card'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@cdlab996/ui/components/input-group'
import { Label } from '@cdlab996/ui/components/label'
import { Slider } from '@cdlab996/ui/components/slider'

interface AdvancedOptionsProps {
  width: number
  setWidth: (width: number) => void
  height: number
  setHeight: (height: number) => void
  numSteps: number
  setNumSteps: (numSteps: number) => void
  guidance: number
  setGuidance: (guidance: number) => void
  seed: number | ''
  setSeed: (seed: number | '') => void
  handleRandomSeed: () => void
}

export function AdvancedOptions({
  width,
  setWidth,
  height,
  setHeight,
  numSteps,
  setNumSteps,
  guidance,
  setGuidance,
  seed,
  setSeed,
  handleRandomSeed,
}: AdvancedOptionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>高级选项</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="width">图像宽度</Label>
            <span className="text-sm font-mono">{width}px</span>
          </div>
          <Slider
            id="width"
            min={256}
            max={2048}
            step={64}
            value={[width]}
            onValueChange={(values) => setWidth(values[0])}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="height">图像高度</Label>
            <span className="text-sm font-mono">{height}px</span>
          </div>
          <Slider
            id="height"
            min={256}
            max={2048}
            step={64}
            value={[height]}
            onValueChange={(values) => setHeight(values[0])}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="num_steps">迭代步数</Label>
            <span className="text-sm font-mono">{numSteps}</span>
          </div>
          <Slider
            id="num_steps"
            min={1}
            max={20}
            step={1}
            value={[numSteps]}
            onValueChange={(values) => setNumSteps(values[0])}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="guidance">引导系数</Label>
            <span className="text-sm font-mono">{guidance.toFixed(1)}</span>
          </div>
          <Slider
            id="guidance"
            min={0}
            max={30}
            step={0.5}
            value={[guidance]}
            onValueChange={(values) => setGuidance(values[0])}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="seed">随机种子</Label>
          <InputGroup>
            <InputGroupInput
              id="seed"
              type="number"
              placeholder="留空则随机生成"
              value={seed}
              onChange={(e) =>
                setSeed(e.target.value ? Number(e.target.value) : '')
              }
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" onClick={handleRandomSeed}>
                <Shuffle className="size-4" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <p className="text-xs text-muted-foreground">
            使用相同的种子值可以在其他参数相同的情况下生成相似的图像
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
