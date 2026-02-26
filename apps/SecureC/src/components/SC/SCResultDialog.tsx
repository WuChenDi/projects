'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@cdlab996/ui/components/dialog'
import { Label } from '@cdlab996/ui/components/label'
import { Textarea } from '@cdlab996/ui/components/textarea'
import { Clipboard, Download } from 'lucide-react'
import { copyToClipboard } from '@/lib'
import type { ProcessResult } from '@/types'
import { ModeEnum } from '@/types'

interface SCResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: ProcessResult | null
  onDownload: (result: ProcessResult) => void
}

export function SCResultDialog({
  open,
  onOpenChange,
  result,
  onDownload,
}: SCResultDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {result?.mode === ModeEnum.ENCRYPT
              ? 'Encrypted Text'
              : 'Decrypted Text'}
          </DialogTitle>
          <DialogDescription>
            {result?.mode === ModeEnum.ENCRYPT
              ? 'Your message has been encrypted successfully'
              : 'Your message has been decrypted successfully'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">
                {result?.mode === ModeEnum.ENCRYPT
                  ? 'Encrypted Content'
                  : 'Decrypted Content'}
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => result && onDownload(result)}
                >
                  <Download />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => result?.text && copyToClipboard(result.text)}
                >
                  <Clipboard />
                </Button>
              </div>
            </div>
            <Textarea
              value={result?.text || ''}
              readOnly
              className="font-mono text-sm min-h-[300px] max-h-[400px]"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
