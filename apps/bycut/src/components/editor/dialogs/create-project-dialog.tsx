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

export function CreateProjectDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (name: string) => void
}) {
  const t = useTranslations()
  const defaultName = t('projects.new')
  const [name, setName] = useState(defaultName)

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName(defaultName)
    }
    onOpenChange(open)
  }

  const handleConfirm = () => {
    onConfirm(name.trim() || defaultName)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('projects.new')}</DialogTitle>
        </DialogHeader>

        <Field>
          <Label>{t('common.name')}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleConfirm()
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
          <Button onClick={handleConfirm}>{t('common.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
