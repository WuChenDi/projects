import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  pathnames: {
    '/': '/',
    '/projects': '/projects',
    '/characters': '/characters',
    '/editor': '/editor',
  },
})
