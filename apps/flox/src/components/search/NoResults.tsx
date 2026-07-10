'use client'

import { Button } from '@cdlab/ui/components/button'
import { IKEmpty } from '@cdlab/ui/IK'
import { Search } from 'lucide-react'

interface NoResultsProps {
  onReset: () => void
}

export function NoResults({ onReset }: NoResultsProps) {
  return (
    <IKEmpty
      title="未找到相关内容"
      description="试试其他关键词或检查拼写"
      icon={Search}
      iconClassName="size-4 text-muted-foreground"
    >
      <Button variant="default" onClick={onReset} size="lg">
        返回首页
      </Button>
    </IKEmpty>
  )
}
