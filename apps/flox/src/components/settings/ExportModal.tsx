'use client'

import { Button } from '@cdlab/ui/components/button'
import { Checkbox } from '@cdlab/ui/components/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cdlab/ui/components/dialog'
import { Label } from '@cdlab/ui/components/label'
import { useEffect, useState } from 'react'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: (
    includeSearchHistory: boolean,
    includeWatchHistory: boolean,
  ) => void
}

export function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  const [includeSearchHistory, setIncludeSearchHistory] = useState(true)
  const [includeWatchHistory, setIncludeWatchHistory] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setIncludeSearchHistory(true)
      setIncludeWatchHistory(true)
    }
  }, [isOpen])

  const handleExport = () => {
    onExport(includeSearchHistory, includeWatchHistory)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>导出设置</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">选择要导出的内容：</p>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="search-history"
              checked={includeSearchHistory}
              onCheckedChange={(v) => setIncludeSearchHistory(!!v)}
            />
            <Label htmlFor="search-history">搜索历史</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="watch-history"
              checked={includeWatchHistory}
              onCheckedChange={(v) => setIncludeWatchHistory(!!v)}
            />
            <Label htmlFor="watch-history">观看历史</Label>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            注意：源设置将始终包含在导出中
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleExport}>导出</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
