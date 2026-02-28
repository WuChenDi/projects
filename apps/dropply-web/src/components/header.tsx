'use client'

import { Button } from '@cdlab996/ui/components/button'
import { ExternalLinkIcon, Github } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Header() {
  return (
    <header className="w-full z-10">
      <div className="container mx-auto">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="https://notes-wudi.pages.dev/images/logo.png"
                alt="Chendi Wu Logo"
                width={32}
                height={32}
                className="rounded-full mr-2"
              />
              {'Dropply'.split('').map((letter, index) => {
                return (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
                    key={index}
                    className="hover:text-fun-pink hover:-mt-2 transition-all duration-500 hover:duration-100 click:goodbyeLetterAnim text-white font-medium"
                  >
                    {letter}
                  </span>
                )
              })}
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="https://notes-wudi.pages.dev/projects/"
                className="text-white hover:text-gray-200 transition-colors flex items-center gap-1 uppercase"
              >
                more
                <ExternalLinkIcon className="w-4 h-4" />
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button asChild variant="outline" size="icon" aria-label="GitHub">
                <Link
                  href="https://github.com/WuChenDi/dropply"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
