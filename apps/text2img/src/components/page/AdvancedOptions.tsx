import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Input } from '@cdlab996/ui/components/input'
import { Label } from '@cdlab996/ui/components/label'
import { ChevronDown, ChevronUp, Shuffle } from 'lucide-react'
import { useState } from 'react'

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
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>高级选项</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            {showAdvanced ? '隐藏' : '显示'}
          </Button>
        </div>
      </CardHeader>
      {showAdvanced && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="width">图像宽度</Label>
              <span className="text-sm font-mono">{width}px</span>
            </div>
            <Input
              id="width"
              type="range"
              min={256}
              max={2048}
              step={64}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="height">图像高度</Label>
              <span className="text-sm font-mono">{height}px</span>
            </div>
            <Input
              id="height"
              type="range"
              min={256}
              max={2048}
              step={64}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="num_steps">迭代步数</Label>
              <span className="text-sm font-mono">{numSteps}</span>
            </div>
            <Input
              id="num_steps"
              type="range"
              min={1}
              max={20}
              step={1}
              value={numSteps}
              onChange={(e) => setNumSteps(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="guidance">引导系数</Label>
              <span className="text-sm font-mono">{guidance.toFixed(1)}</span>
            </div>
            <Input
              id="guidance"
              type="range"
              min={0}
              max={30}
              step={0.5}
              value={guidance}
              onChange={(e) => setGuidance(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seed">随机种子</Label>
            <div className="flex gap-2">
              <Input
                id="seed"
                type="number"
                placeholder="留空则随机生成"
                value={seed}
                onChange={(e) =>
                  setSeed(e.target.value ? Number(e.target.value) : '')
                }
              />
              <Button variant="outline" size="icon" onClick={handleRandomSeed}>
                <Shuffle className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              使用相同的种子值可以在其他参数相同的情况下生成相似的图像
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
