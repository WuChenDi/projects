'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cdlab996/ui/components/select'
import { cn } from '@cdlab996/ui/lib/utils'
import { CheckCircle } from 'lucide-react'
import type { ModelStatus, RemovalModel } from '@/types'

interface ModelSelectorProps {
  currentModel: RemovalModel
  modelStatus: ModelStatus
  isModelInitialized: boolean
  isModelSwitching: boolean
  isIOS: boolean
  onModelChange: (model: RemovalModel) => void
}

export const ModelSelector = ({
  currentModel,
  modelStatus,
  isModelInitialized,
  isModelSwitching,
  isIOS,
  onModelChange,
}: ModelSelectorProps) => {
  if (isIOS) {
    return (
      <p className="text-sm text-muted-foreground">
        Using optimized iOS background removal
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium">Select Model:</span>
        {isModelInitialized && currentModel === 'wuchendi/MODNet' && (
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
              {
                'bg-green-500/20 text-green-400': modelStatus === 'ready',
                'bg-blue-500/20 text-blue-400': modelStatus === 'loading',
              },
            )}
          >
            {modelStatus === 'ready' && <CheckCircle className="w-3 h-3" />}
            {modelStatus === 'loading' && (
              <div className="inline-block animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-400"></div>
            )}
            <span>{modelStatus === 'ready' ? 'Ready' : 'Loading'}</span>
          </div>
        )}
      </div>
      <Select
        value={currentModel}
        onValueChange={(value: RemovalModel) => onModelChange(value)}
        disabled={isModelSwitching}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="wuchendi/MODNet">MODNet (WebGPU)</SelectItem>
          <SelectItem value="briaai/RMBG-2.0">RMBG-2.0 (Advanced)</SelectItem>
          <SelectItem value="briaai/RMBG-1.4">
            RMBG-1.4 (Cross-browser)
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
