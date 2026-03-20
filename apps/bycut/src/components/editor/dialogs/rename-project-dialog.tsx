import { Button } from '@cdlab996/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cdlab996/ui/components/dialog'
import { Field } from '@cdlab996/ui/components/field'
import { Input } from '@cdlab996/ui/components/input'
import { Label } from '@cdlab996/ui/components/label'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export function RenameProjectDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  projectName,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (newName: string) => void
  projectName: string
}) {
  const t = useTranslations()
  const [name, setName] = useState(projectName)

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName(projectName)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('projects.rename')}</DialogTitle>
        </DialogHeader>

        <Field>
          <Label>{t('projects.newName')}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onConfirm(name)
              }
            }}
            placeholder={t('projects.enterNewName')}
          />
        </Field>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onOpenChange(false)
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={() => onConfirm(name)}>{t('common.rename')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
