import Link from 'next/link'
import { useTranslations } from 'next-intl'

export function Footer() {
  const t = useTranslations('footer')

  return (
    <footer className="relative w-full z-10 border-t border-dashed text-sm py-6">
      <div className="flex items-center justify-center">
        {t('copyright')}
        <Link href="https://github.com/WuChenDi/" className="text-primary pl-2">
          wudi
        </Link>
      </div>
    </footer>
  )
}
