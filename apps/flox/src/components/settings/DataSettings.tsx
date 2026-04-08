'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Separator } from '@cdlab996/ui/components/separator'

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

        <Separator />

        <div className="space-y-2">
          <div className="text-sm font-medium text-destructive">危险操作</div>

          <Button
            variant="destructive"
            className="w-full justify-between"
            onClick={onReset}
          >
            <div className="flex items-center gap-2">
              <Trash2 className="size-4" />
              清除所有数据
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
