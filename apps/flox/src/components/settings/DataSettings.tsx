'use client'

import { Button } from '@cdlab/ui/components/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@cdlab/ui/components/card'

import { Download, Trash2, Upload } from 'lucide-react'

interface DataSettingsProps {
  onExport: () => void
  onImport: () => void
  onReset: () => void
}

export function DataSettings({
  onExport,
  onImport,
  onReset,
}: DataSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>数据管理</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 justify-between"
            onClick={onExport}
          >
            <div className="flex items-center gap-2">
              <Download className="size-4" />
              导出设置
            </div>
          </Button>

          <Button
            variant="outline"
            className="flex-1 justify-between"
            onClick={onImport}
          >
            <div className="flex items-center gap-2">
              <Upload className="size-4" />
              导入设置
            </div>
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button variant="destructive" className="w-full" onClick={onReset}>
          <Trash2 className="size-4" />
          清除所有数据
        </Button>
      </CardFooter>
    </Card>
  )
}
