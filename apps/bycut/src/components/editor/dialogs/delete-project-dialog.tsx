import { IKConfirmDialog } from '@cdlab996/ui/IK'
import { useTranslations } from 'next-intl'

export function DeleteProjectDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  projectNames,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  projectNames: string[]
}) {
  const t = useTranslations()
  const count = projectNames.length
  const isSingle = count === 1
  const singleName = isSingle ? projectNames[0] : null

  return (
    <IKConfirmDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      title={
        singleName
          ? t('projects.deleteNamed', { name: singleName })
          : t('projects.deleteCount', { num: count })
      }
      description={
        singleName
          ? t('projects.deleteConfirm', { name: singleName })
          : t('projects.deleteCountConfirm', { num: count })
      }
      onConfirm={onConfirm}
      confirmText={t('common.delete')}
      cancelText={t('common.cancel')}
    />
  )
}
