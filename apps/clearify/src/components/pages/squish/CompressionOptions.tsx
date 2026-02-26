'use client'

import { Card } from '@cdlab996/ui/components/card'
import { Field } from '@cdlab996/ui/components/field'
import { Label } from '@cdlab996/ui/components/label'
import { Slider } from '@cdlab996/ui/components/slider'
import { ToggleGroup, ToggleGroupItem } from '@cdlab996/ui/components/toggle-group'
import type {
  CompressionOptions as CompressionOptionsType,
  OutputType,
} from '@/types'

interface CompressionOptionsProps {
  outputType: OutputType
  options: CompressionOptionsType
  onOutputTypeChange: (type: OutputType) => void
  onQualityChange: (value: number) => void
}

export const CompressionOptions = ({
  outputType,
  options,
  onOutputTypeChange,
  onQualityChange,
}: CompressionOptionsProps) => (
  <Card className="p-4 rounded-md">
    <Field>
      <Label>Output Format</Label>
      <ToggleGroup
        variant="outline"
        type="single"
        value={outputType}
        onValueChange={(value) => {
          if (value) onOutputTypeChange(value as OutputType)
        }}
        className="grid grid-cols-5"
      >
        {(['avif', 'jpeg', 'jxl', 'png', 'webp'] as const).map((format) => (
          <ToggleGroupItem
            key={format}
            value={format}
            aria-label={`Select ${format} format`}
            className="uppercase text-xs font-bold w-full"
          >
            {format}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
    {outputType !== 'png' && (
      <Field>
        <Label htmlFor="imageQualityRangeInput">
          Quality: {options.quality}%
        </Label>
        <Slider
          id="imageQualityRangeInput"
          value={[options.quality]}
          min={1}
          max={100}
          step={1}
          onValueChange={(value) => onQualityChange(value[0])}
          className="w-full focus:outline-none"
        />
      </Field>
    )}
  </Card>
)
