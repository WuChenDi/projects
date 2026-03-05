<script setup>
const route = useRoute()

const siteConfig = {
  title: 'Repository Changelog',
  description: 'Track the latest releases and changelogs from your favorite open source repositories',
  url: 'https://repo-changelog.vercel.app/',
  image: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/repo-changelog/index.png',
  author: {
    name: 'wudi',
    twitter: '@wuchendi96'
  },
  navigation: {
    links: [
      {
        label: 'GitHub',
        icon: 'i-simple-icons-github',
        variant: 'outline',
        size: 'md',
        to: 'https://github.com/WuChenDi/repo-changelog',
        target: '_blank'
      }
      // {
      //   label: 'More',
      //   icon: 'i-lucide-external-link',
      //   variant: 'outline',
      //   size: 'md',
      //   to: 'https://notes-wudi.pages.dev/projects',
      //   target: '_blank'
      // }
    ]
  },
  meta: {
    favicon: '/logo.svg',
    lang: 'en',
    keywords: [
      'repository changelog',
      'github releases',
      'open source',
      'version tracking',
      'release notes',
      'git changelog',
      'software updates',
      'developer tools',
      'project tracking',
      'changelog generator'
    ]
  }
}

useHead({
  title: siteConfig.title,
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
    { name: 'title', content: siteConfig.title },
    { name: 'description', content: siteConfig.description },
    { name: 'keywords', content: siteConfig.meta.keywords.join(', ') },
    { name: 'referrer', content: 'no-referrer-when-downgrade' },
    { name: 'author', content: siteConfig.author.name },
    { name: 'creator', content: siteConfig.author.name },
    { name: 'publisher', content: 'Repository Changelog' },
    { name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' },
    { name: 'googlebot', content: 'index, follow' },
    { name: 'revisit-after', content: '7 days' },
    { name: 'distribution', content: 'global' },
    { name: 'rating', content: 'general' },
    { name: 'copyright', content: '© 2025 wudi. All rights reserved.' },
    { name: 'language', content: 'en' },
    { name: 'classification', content: 'Developer Tools, Open Source, Software Development' },
    { name: 'category', content: 'repository tracker,changelog,developer tools' },
    { name: 'application-name', content: 'Repository Changelog' },

    // Open Graph / Facebook
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: siteConfig.url },
    { property: 'og:site_name', content: siteConfig.title },
    { property: 'og:locale', content: 'en_US' },
    { property: 'og:image:alt', content: 'Repository Changelog - Track releases and changelogs' },
    { property: 'article:author', content: siteConfig.author.name },
    { property: 'article:section', content: 'Developer Tools' },
    { property: 'article:tag', content: 'repository,changelog,github,releases' },

    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: siteConfig.author.twitter },
    { name: 'twitter:creator', content: siteConfig.author.twitter },
    { name: 'twitter:title', content: siteConfig.title },
    { name: 'twitter:description', content: siteConfig.description },
    { name: 'twitter:image', content: siteConfig.image }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: siteConfig.meta.favicon },
    { rel: 'apple-touch-icon', href: siteConfig.meta.favicon },
    { rel: 'canonical', href: siteConfig.url },
    // Preconnect for Performance
    { rel: 'preconnect', href: 'https://cdn.jsdelivr.net' },
    { rel: 'dns-prefetch', href: 'https://cdn.jsdelivr.net' }
  ],
  htmlAttrs: {
    lang: siteConfig.meta.lang
  },
  script: [
    // JSON-LD Structured Data - Website
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': siteConfig.title,
        'url': siteConfig.url,
        'description': siteConfig.description,
        'inLanguage': 'en',
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${siteConfig.url}?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      })
    },
    // JSON-LD Structured Data - WebApplication
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        'name': siteConfig.title,
        'description': siteConfig.description,
        'url': siteConfig.url,
        'applicationCategory': 'DeveloperApplication',
        'operatingSystem': 'Web',
        'browserRequirements': 'Requires JavaScript. Compatible with Chrome 90+, Firefox 88+, Safari 14+, Edge 90+',
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD',
          'availability': 'https://schema.org/InStock'
        },
        'author': {
          '@type': 'Person',
          'name': siteConfig.author.name,
          'url': 'https://github.com/WuChenDi'
        },
        'publisher': {
          '@type': 'Organization',
          'name': siteConfig.author.name,
          'url': siteConfig.url
        },
        'datePublished': '2024-01-01',
        'dateModified': new Date().toISOString().split('T')[0],
        'inLanguage': 'en',
        'isAccessibleForFree': true,
        'keywords': siteConfig.meta.keywords.join(', '),
        'screenshot': {
          '@type': 'ImageObject',
          'contentUrl': siteConfig.image,
          'description': 'Repository Changelog interface screenshot'
        },
        'featureList': [
          'Track latest releases from open source repositories',
          'View detailed changelogs and release notes',
          'Support for multiple repository formats',
          'Real-time updates and notifications',
          'Clean and intuitive user interface',
          'Free to use, no registration required'
        ],
        'sameAs': [
          'https://github.com/WuChenDi/repo-changelog',
          'https://x.com/wuchendi96'
        ]
      })
    },
    // JSON-LD Structured Data - SoftwareApplication
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': siteConfig.title,
        'applicationCategory': 'DeveloperApplication',
        'offers': {
          '@type': 'Offer',
          'price': '0'
        },
        'operatingSystem': 'Any',
        'permissions': 'Browser access'
      })
    },
    // JSON-LD Structured Data - BreadcrumbList
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [{
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': siteConfig.url
        }]
      })
    }
  ]
})

useSeoMeta({
  title: siteConfig.title,
  description: siteConfig.description,

  ogTitle: siteConfig.title,
  ogDescription: siteConfig.description,
  ogUrl: siteConfig.url,
  ogSiteName: siteConfig.title,
  ogImage: siteConfig.image,
  ogImageAlt: 'Repository Changelog - Track releases and changelogs',
  ogLocale: 'en_US',
  ogType: 'website',

  twitterTitle: siteConfig.title,
  twitterDescription: siteConfig.description,
  twitterImage: siteConfig.image,
  twitterCard: 'summary_large_image'
})

const isReposPage = computed(() => {
  return route.name === 'repos'
})

const isHomePage = computed(() => {
  return route.name === 'index'
})
</script>

<template>
  <UApp>
    <div
      v-if="isReposPage"
      class="min-h-[calc(100vh-68px)]"
    >
      <UColorModeButton class="fixed top-4 right-4 z-10" />
      <NuxtPage />
    </div>

    <div
      v-else-if="isHomePage"
      class="min-h-[calc(100vh-68px)] w-full relative bg-background dark:bg-black"
    >
      <UPageSection
        :title="siteConfig.title"
        :description="siteConfig.description"
        :links="siteConfig.navigation.links"
        orientation="vertical"
        class="relative overflow-hidden"
      >
        <template #top>
          <SkyBg />
          <div
            class="absolute inset-0 z-[-1]"
            :style="{
              backgroundImage: `
                  linear-gradient(to right, rgba(99, 102, 241, 0.4) 0%, transparent 1px),
                  linear-gradient(to bottom, rgba(181, 184, 208, 0.3) 0%, transparent 1px)
                `,
              backgroundSize: `40px 40px`,
              WebkitMaskImage:
                `radial-gradient(ellipse 100% 90% at 50% 0%, #000 90%, transparent 100%)`,
              maskImage:
                `radial-gradient(ellipse 100% 90% at 50% 0%, #000 90%, transparent 100%)`
            }"
          />
        </template>
      </UPageSection>

      <main class="px-4 sm:px-6 pb-16 bg-background/50 dark:bg-transparent">
        <UColorModeButton class="fixed top-4 right-4 z-10 backdrop-blur-sm bg-background/80 dark:bg-gray-900/80 rounded-full p-2" />
        <NuxtPage />
      </main>
    </div>

    <div
      v-else
      class="min-h-[calc(100vh-68px)] w-full"
    >
      <UColorModeButton class="fixed top-4 right-4 z-10" />
      <NuxtPage />
    </div>

    <Footer />
  </UApp>
</template>
