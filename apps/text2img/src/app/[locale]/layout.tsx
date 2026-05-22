/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Toaster } from '@cdlab996/ui/components/sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import type { Locale } from 'next-intl'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'

import '@cdlab996/ui/globals.css'
import { IKHeader } from '@cdlab996/ui/IK'
import {
  ClientProviders,
  LanguageSelector,
  ThemeToggle,
} from '@/components/layout'
import { routing } from '@/i18n/routing'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

interface RootLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: Locale }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  if (locale === 'zh') {
    return {
      title: 'AI文生图在线工具 | 基于 Cloudflare AI 的免费图像生成服务',
      icons: 'https://wcd.pages.dev/logo.png',
      description:
        '免费的在线AI文生图工具，基于 Cloudflare Workers AI，支持 FLUX.1、Stable Diffusion XL 等多种模型。无需注册，即刻使用，快速生成高质量AI图像。',
      keywords: [
        'AI文生图',
        'AI绘画',
        'AI图像生成',
        'Text to Image',
        'Stable Diffusion',
        'FLUX.1',
        'Cloudflare AI',
        '在线AI绘图',
        '免费AI生成',
        'AI艺术创作',
        'Prompt 生成',
        '人工智能绘画',
        'Stable Diffusion XL',
        'DreamShaper',
        'AI图片制作',
      ],
      referrer: 'no-referrer-when-downgrade',
      authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
      creator: 'wudi',
      publisher: 'AI文生图服务',
      robots: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
      metadataBase: new URL('https://text2img.cdlab.workers.dev/'),
      alternates: { canonical: '/' },
      applicationName: 'AI文生图在线工具',
      category: 'AI工具, 图像生成, 创意工具',
      classification: 'AI工具, 图像生成软件, 创意应用',
      openGraph: {
        title: 'AI文生图在线工具 | 基于 Cloudflare AI 的免费图像生成',
        description:
          '免费的在线AI文生图工具，支持 FLUX.1、Stable Diffusion XL 等多种先进模型。无需注册，即刻体验高质量AI图像生成。',
        url: 'https://text2img.cdlab.workers.dev/',
        siteName: 'AI文生图服务',
        images: [
          {
            url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/index.png',
            width: 1200,
            height: 630,
            alt: 'AI文生图工具界面预览',
          },
        ],
        locale: 'zh_CN',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'AI文生图在线工具 | 基于 Cloudflare AI',
        description:
          '免费的在线AI文生图工具，支持多种先进AI模型，即刻体验高质量图像生成。',
        images: [
          'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/index.png',
        ],
        creator: '@wuchendi96',
        site: '@wuchendi96',
      },
      other: {
        'revisit-after': '3 days',
        distribution: 'global',
        rating: 'general',
        copyright: '© 2025 wudi. All rights reserved.',
        language: 'zh-CN',
        googlebot: 'index, follow',
      },
    }
  }

  return {
    title: 'AI Text-to-Image Tool | Free Image Generation with Cloudflare AI',
    icons: 'https://wcd.pages.dev/logo.png',
    description:
      'Free online AI text-to-image tool powered by Cloudflare Workers AI. Supports FLUX.1, Stable Diffusion XL and more. No registration required.',
    keywords: [
      'AI Text to Image',
      'AI Art',
      'AI Image Generation',
      'Text to Image',
      'Stable Diffusion',
      'FLUX.1',
      'Cloudflare AI',
      'Online AI Drawing',
      'Free AI Generation',
      'AI Art Creation',
      'Prompt Generation',
      'AI Painting',
      'Stable Diffusion XL',
      'DreamShaper',
      'AI Image Maker',
    ],
    referrer: 'no-referrer-when-downgrade',
    authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
    creator: 'wudi',
    publisher: 'AI Text-to-Image',
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
    metadataBase: new URL('https://text2img.cdlab.workers.dev/'),
    alternates: { canonical: '/' },
    applicationName: 'AI Text-to-Image Tool',
    category: 'AI Tools, Image Generation, Creative Tools',
    classification:
      'AI Tools, Image Generation Software, Creative Applications',
    openGraph: {
      title: 'AI Text-to-Image Tool | Free Image Generation with Cloudflare AI',
      description:
        'Free online AI text-to-image tool supporting FLUX.1, Stable Diffusion XL and more advanced models. Experience high-quality AI image generation instantly.',
      url: 'https://text2img.cdlab.workers.dev/',
      siteName: 'AI Text-to-Image',
      images: [
        {
          url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/index.png',
          width: 1200,
          height: 630,
          alt: 'AI Text-to-Image Tool Interface',
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'AI Text-to-Image Tool | Cloudflare AI',
      description:
        'Free online AI text-to-image tool supporting multiple advanced AI models for high-quality image generation.',
      images: [
        'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/index.png',
      ],
      creator: '@wuchendi96',
      site: '@wuchendi96',
    },
    other: {
      'revisit-after': '3 days',
      distribution: 'global',
      rating: 'general',
      copyright: '© 2025 wudi. All rights reserved.',
      language: 'en-US',
      googlebot: 'index, follow',
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: RootLayoutProps) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  const messages = await getMessages()
  const inLanguage = locale === 'zh' ? 'zh-CN' : 'en-US'

  return (
    <html lang={locale}>
      <head>
        {/* JSON-LD Structured Data - Website */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'AI Text-to-Image Tool',
              url: 'https://text2img.cdlab.workers.dev/',
              description:
                'Free online AI text-to-image tool powered by Cloudflare AI',
              inLanguage,
              potentialAction: {
                '@type': 'SearchAction',
                target:
                  'https://text2img.cdlab.workers.dev/?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />

        {/* JSON-LD Structured Data - WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'AI Text-to-Image Tool',
              description:
                'Powerful online AI text-to-image tool powered by Cloudflare Workers AI, supporting FLUX.1 schnell, Stable Diffusion XL, DreamShaper and more.',
              url: 'https://text2img.cdlab.workers.dev/',
              applicationCategory: 'MultimediaApplication',
              operatingSystem: 'Web',
              browserRequirements:
                'Requires JavaScript enabled. Compatible with Chrome 90+, Firefox 88+, Safari 14+, Edge 90+',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
              },
              author: {
                '@type': 'Person',
                name: 'wudi',
                url: 'https://github.com/WuChenDi',
              },
              publisher: {
                '@type': 'Organization',
                name: 'AI Text-to-Image',
                url: 'https://text2img.cdlab.workers.dev/',
              },
              datePublished: '2025-01-01',
              dateModified: new Date().toISOString().split('T')[0],
              inLanguage,
              isAccessibleForFree: true,
              keywords:
                'AI text-to-image, AI art, Stable Diffusion, FLUX.1, Cloudflare AI, image generation',
              screenshot: {
                '@type': 'ImageObject',
                contentUrl:
                  'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/index.png',
                description: 'AI Text-to-Image Tool Interface',
              },
              softwareVersion: '1.0.0',
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '200',
                bestRating: '5',
                worstRating: '1',
              },
              featureList: [
                'Multiple AI models (FLUX.1, Stable Diffusion XL, DreamShaper, etc.)',
                'Completely free to use',
                'No registration required',
                'Random prompt library',
                'Advanced parameter customization',
                'Image size adjustment (256-2048px)',
                'Iteration steps control',
                'Guidance scale adjustment',
                'Random seed settings',
                'One-click image download',
                'Parameter copy function',
                'Dark/Light theme toggle',
                'Responsive design for mobile',
              ],
              sameAs: [
                'https://github.com/WuChenDi',
                'https://x.com/wuchendi96',
              ],
            }),
          }}
        />

        {/* JSON-LD Structured Data - BreadcrumbList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: locale === 'zh' ? '首页' : 'Home',
                  item: 'https://text2img.cdlab.workers.dev/',
                },
              ],
            }),
          }}
        />

        {/* JSON-LD Structured Data - SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'wudi',
              url: 'https://github.com/WuChenDi',
              logo: 'https://wcd.pages.dev/logo.png',
              applicationCategory: 'MultimediaApplication',
              offers: {
                '@type': 'Offer',
                price: '0',
              },
              operatingSystem: 'Any',
              permissions: 'Browser access',
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <ClientProviders>
            <IKHeader
              brand="Text2Img"
              githubHref="https://github.com/WuChenDi/projects/tree/main/apps/text2img"
            >
              <LanguageSelector />
              <ThemeToggle />
            </IKHeader>
            {children}
            <Toaster richColors position="top-center" duration={3000} />
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
