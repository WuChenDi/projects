'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Label } from '@cdlab996/ui/components/label'
import { RadioGroup, RadioGroupItem } from '@cdlab996/ui/components/radio-group'
import { sortOptions } from '@/lib/store/settings-helpers'
import type { SortOption } from '@/lib/store/settings-store'

interface SortSettingsProps {
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
}

export function SortSettings({ sortBy, onSortChange }: SortSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>搜索结果排序</CardTitle>
        <CardDescription>选择搜索结果的默认排序方式</CardDescription>
      </CardHeader>

      <CardContent>
        <RadioGroup
          value={sortBy}
          onValueChange={(val) => onSortChange(val as SortOption)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {(Object.keys(sortOptions) as SortOption[]).map((option) => (
            <Label
              key={option}
              className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition
                ${
                  sortBy === option
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
            >
              <RadioGroupItem value={option} />

              <span className="text-sm font-medium">{sortOptions[option]}</span>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
