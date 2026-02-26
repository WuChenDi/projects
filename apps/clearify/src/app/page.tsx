'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { cn } from '@cdlab996/ui/lib/utils'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  FireExtinguisher,
  Image,
  Sparkles,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import { Footer, PageContainer } from '@/components/layout'
import Aurora from '@/components/reactbits/Aurora'
import GradientText from '@/components/reactbits/GradientText'
import Particles from '@/components/reactbits/Particles'
import ShinyText from '@/components/reactbits/ShinyText'
import SplashCursor from '@/components/reactbits/SplashCursor'

interface Task {
  id: string
  title: string
  subtitle: string
  description: string
  icon: LucideIcon
  color: string
  route: string
}

const tasks: Task[] = [
  {
    id: 'remove-background',
    title: 'Remove Image Background',
    subtitle: 'AI-powered background removal',
    description:
      'Instantly remove backgrounds from any image using advanced AI. Perfect for portraits, product photos, and creating transparent images.',
    icon: Image,
    color: 'bg-gradient-to-r from-purple-500 to-blue-500',
    route: '/bg',
  },
  {
    id: 'squish',
    title: 'Image Squish',
    subtitle: 'Smart image compression',
    description:
      'Compress images up to 90% while maintaining quality. Fast browser-based processing with support for multiple formats including JPEG, PNG, and WebP.',
    icon: FireExtinguisher,
    color: 'bg-gradient-to-r from-orange-500 to-red-500',
    route: '/squish',
  },
  {
    id: 'compress',
    title: 'Video Compress',
    subtitle: 'Efficient video compression',
    description:
      'Reduce video file sizes by up to 90% without quality loss. Fast browser-based compression with no uploads required.',
    icon: Video,
    color: 'bg-gradient-to-r from-teal-500 to-cyan-500',
    route: '/compress',
  },
]

export default function Home() {
  return (
    <>
      <div className="h-[calc(100dvh-80px)] flex-1 flex flex-col">
        <PageContainer scrollable={false} className="relative">
          <div className="relative w-full max-w-4xl mx-auto space-y-12 z-1">
            <div className="text-center mb-8">
              <GradientText className="text-3xl md:text-4xl lg:text-5xl font-bold bg-linear-to-r">
                Clearify
              </GradientText>
              <div className="mt-6">
                <ShinyText
                  text="Powerful web-based tools for your image editing needs"
                  disabled={false}
                  speed={3}
                  className="text-base md:text-lg text-gray-600 dark:text-gray-300"
                />
              </div>
              <div className="mt-4 flex items-center justify-center">
                <Sparkles className="size-5 text-amber-500 mr-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  All images are processed locally on your device and are not
                  uploaded to any server.
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <div
                className={cn(
                  'grid grid-cols-1 gap-8',
                  tasks.length > 1
                    ? 'md:grid-cols-2 w-full'
                    : 'max-w-md w-full',
                )}
              >
                {tasks.map((task) => (
                  <Card
                    key={task.id}
                    className="relative ring-0 bg-black/20 shadow-[0_8px_32px_rgba(31,38,135,0.15)] backdrop-blur-[15px]"
                    // className="relative ring-1 bg-transparent"
                  >
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className={cn('p-3 rounded-xl', task.color)}>
                          <task.icon size={22} />
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-2xl font-bold">
                            {task.title}
                          </CardTitle>
                          {task.subtitle && (
                            <CardDescription>{task.subtitle}</CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col h-full">
                      <p className="text-muted-foreground">
                        {task.description}
                      </p>
                      <div className="mt-auto pt-6">
                        <Link href={task.route} passHref>
                          <Button
                            className={cn('w-full border-none', task.color)}
                          >
                            Try it now
                            <ArrowRight />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </PageContainer>
        <Footer />
      </div>
      <div className="fixed inset-0">
        <Aurora
          colorStops={['#4C00FF', '#97FFF4', '#FF3D9A']}
          blend={3.3}
          amplitude={0.3}
          speed={1.3}
        />
      </div>
      <div className="fixed inset-0">
        <Particles
          particleColors={['#ffffff', '#ffffff']}
          particleCount={400}
          particleSpread={10}
          speed={0.05}
          particleBaseSize={100}
          moveParticlesOnHover={false}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>
      <SplashCursor />
    </>
  )
}
