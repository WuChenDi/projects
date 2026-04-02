import {
  TabsList,
  TabsTrigger,
} from '@cdlab996/ui/components/tabs'
import { Download, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function TabSwitcher() {
  const t = useTranslations('tabs')

  return (
    <TabsList className="w-full">
      <TabsTrigger value="share" className="flex-1 gap-1.5">
        <Upload size={14} />
        {t('share')}
      </TabsTrigger>
      <TabsTrigger value="retrieve" className="flex-1 gap-1.5">
        <Download size={14} />
        {t('retrieve')}
      </TabsTrigger>
    </TabsList>
  )
}
