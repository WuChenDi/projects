'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cdlab996/ui/components/dialog'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { formatTimeCode } from '@/lib/time'
import type { TProjectMetadata } from '@/types/project'

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string | React.ReactNode
}) {
  return (
    <div className="flex justify-between items-center py-0 last:pb-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

export function ProjectInfoDialog({
  isOpen,
  onOpenChange,
  project,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  project: TProjectMetadata
}) {
  const t = useTranslations()
  const durationFormatted =
    project.duration > 0
      ? formatTimeCode({
          timeInSeconds: project.duration,
          format: project.duration >= 3600 ? 'HH:MM:SS' : 'MM:SS',
        })
      : '0:00'

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="truncate max-w-[350px]">
            {project.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col">
          <InfoRow label={t('common.duration')} value={durationFormatted} />
          <InfoRow
            label={t('common.created')}
            value={format(new Date(project.createdAt), 'yyyy-MM-dd HH:mm:ss')}
          />
          <InfoRow
            label={t('common.modified')}
            value={format(new Date(project.updatedAt), 'yyyy-MM-dd HH:mm:ss')}
          />
          <InfoRow
            label={t('projects.id')}
            value={
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {project.id}
              </code>
            }
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            {t('common.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
