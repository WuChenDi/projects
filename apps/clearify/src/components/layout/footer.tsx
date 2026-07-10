import { GitHubIcon } from '@cdlab/ui/icon'
import { FireExtinguisher, Image, Video } from 'lucide-react'
import Link from 'next/link'
import type { ComponentType } from 'react'

const REPO_URL = 'https://github.com/WuChenDi/projects/tree/main/apps/clearify'
const AUTHOR_URL = 'https://github.com/WuChenDi'

interface FooterLink {
  label: string
  href: string
  external?: boolean
  icon?: ComponentType<{ className?: string }>
}

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Tools',
    links: [
      { label: 'Remove Background', href: '/bg', icon: Image },
      { label: 'Image Squish', href: '/squish', icon: FireExtinguisher },
      { label: 'Video Compress', href: '/compress', icon: Video },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'GitHub', href: REPO_URL, external: true, icon: GitHubIcon },
      { label: 'Author', href: AUTHOR_URL, external: true },
    ],
  },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-8 border-t border-white/10 pt-12">
      <div className="flex flex-col gap-10 md:flex-row md:justify-between">
        <div className="max-w-xs space-y-3">
          <span className="text-lg font-bold">Clearify</span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Privacy-first image &amp; video tools that run entirely in your
            browser.
          </p>
          <p className="text-xs text-muted-foreground/80">
            No uploads · No tracking · No sign-up
          </p>
        </div>

        <div className="flex flex-wrap gap-x-16 gap-y-10">
          {columns.map((column) => (
            <nav key={column.title} className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                {column.title}
              </p>
              <ul className="space-y-2.5">
                {column.links.map((link) => {
                  const Icon = link.icon
                  const content = (
                    <span className="inline-flex items-center gap-2 text-sm text-foreground/80 transition-colors hover:text-foreground">
                      {Icon ? <Icon className="size-4" /> : null}
                      {link.label}
                    </span>
                  )
                  return (
                    <li key={link.label}>
                      {link.external ? (
                        <a href={link.href} target="_blank" rel="noreferrer">
                          {content}
                        </a>
                      ) : (
                        <Link href={link.href}>{content}</Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          © {year}-PRESENT ·{' '}
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground hover:underline"
          >
            wudi
          </a>
        </span>
        <span className="font-mono text-muted-foreground/70">
          Built with Next.js · Runs on-device
        </span>
      </div>
    </footer>
  )
}
