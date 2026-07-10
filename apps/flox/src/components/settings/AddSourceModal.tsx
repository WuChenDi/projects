'use client'

import { Alert, AlertDescription } from '@cdlab/ui/components/alert'
import { Button } from '@cdlab/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cdlab/ui/components/dialog'
import { Input } from '@cdlab/ui/components/input'
import { Label } from '@cdlab/ui/components/label'
import type { VideoSource } from '@/lib/types'
import { useAddSourceForm } from './hooks/useAddSourceForm'

interface AddSourceModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (source: VideoSource) => void
  existingIds: string[]
  initialValues?: VideoSource | null
}

export function AddSourceModal({
  isOpen,
  onClose,
  onAdd,
  existingIds,
  initialValues,
}: AddSourceModalProps) {
  const { name, setName, url, setUrl, error, handleSubmit } = useAddSourceForm({
    isOpen,
    existingIds,
    onAdd,
    onClose,
    initialValues,
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialValues ? '编辑视频源' : '添加自定义源'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            添加自定义源，用于获取视频源数据。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source-name">源名称</Label>
            <Input
              id="source-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：新视频源"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-url">接口地址</Label>
            <Input
              id="source-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/api.php/provide/vod"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              取消
            </Button>
            <Button type="submit" className="flex-1">
              {initialValues ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
