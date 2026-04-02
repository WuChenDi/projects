import {
  TabsList,
  TabsTrigger,
} from '@cdlab996/ui/components/tabs'
import { Download, Upload } from 'lucide-react'

export function TabSwitcher() {
  return (
    <TabsList className="w-full">
      <TabsTrigger value="share" className="flex-1 gap-1.5">
        <Upload size={14} />
        Share
      </TabsTrigger>
      <TabsTrigger value="retrieve" className="flex-1 gap-1.5">
        <Download size={14} />
        Retrieve
      </TabsTrigger>
    </TabsList>
  )
}
