import { redirect } from 'next/navigation'
import { routing } from '@/i18n/routing'

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const validLocale = routing.locales.includes(locale as 'en' | 'zh')
    ? locale
    : routing.defaultLocale
  redirect(`/${validLocale}/projects`)
}
