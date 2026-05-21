import { IKHeader } from '@cdlab996/ui/IK/IKHeader'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export function Header() {
  return (
    <IKHeader
      brand="ByShot"
      githubHref="https://github.com/WuChenDi/projects/tree/main/apps/byshot"
    >
      <ThemeToggle />
    </IKHeader>
  )
}
