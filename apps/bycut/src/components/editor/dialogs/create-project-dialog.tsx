import { Button } from '@cdlab/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cdlab/ui/components/dialog'
import { Field } from '@cdlab/ui/components/field'
import { Input } from '@cdlab/ui/components/input'
import { Label } from '@cdlab/ui/components/label'
import { RadioGroup, RadioGroupItem } from '@cdlab/ui/components/radio-group'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { TProjectType } from '@/types/project'

export function CreateProjectDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (name: string, type: TProjectType) => void
}) {
  const t = useTranslations()
  const defaultName = t('projects.new')
  const [name, setName] = useState(defaultName)
  const [type, setType] = useState<TProjectType>('video')

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName(defaultName)
      setType('video')
    }
    onOpenChange(open)
  }

  const handleConfirm = () => {
    onConfirm(name.trim() || defaultName, type)
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

        <Field>
          <Label>{t('projects.typeLabel')}</Label>
          <RadioGroup
            value={type}
            onValueChange={(value) => setType(value as TProjectType)}
          >
            <Label className="flex items-center gap-2 font-normal">
              <RadioGroupItem value="video" />
              {t('projects.typeVideo')}
            </Label>
            <Label className="flex items-center gap-2 font-normal">
              <RadioGroupItem value="audio" />
              {t('projects.typeAudio')}
            </Label>
          </RadioGroup>
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
