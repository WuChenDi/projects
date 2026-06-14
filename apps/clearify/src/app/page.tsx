'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@cdlab996/ui/components/accordion'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { IKPageContainer } from '@cdlab996/ui/IK'
import { GitHubIcon } from '@cdlab996/ui/icon'
import { cn } from '@cdlab996/ui/lib/utils'
import Aurora from '@cdlab996/ui/reactbits/Aurora'
import GradientText from '@cdlab996/ui/reactbits/GradientText'
import Particles from '@cdlab996/ui/reactbits/Particles'
import ShinyText from '@cdlab996/ui/reactbits/ShinyText'
import SplashCursor from '@cdlab996/ui/reactbits/SplashCursor'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  CloudOff,
  Cpu,
  Download,
  FireExtinguisher,
  Gauge,
  Image,
  Lock,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import type { ComponentType } from 'react'
import { useRef } from 'react'
import { Footer } from '@/components/layout/footer'

const GITHUB_URL =
  'https://github.com/WuChenDi/projects/tree/main/apps/clearify'

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

const features: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}[] = [
  {
    icon: ShieldCheck,
    title: 'Runs on your device',
    description:
      'Every pixel is processed locally with WebGPU, WebAssembly and Web Workers — no server round-trips.',
  },
  {
    icon: CloudOff,
    title: 'Nothing is uploaded',
    description:
      'Your photos and videos never leave the tab. There is no storage, no tracking, no account.',
  },
  {
    icon: Gauge,
    title: 'Up to 90% smaller',
    description:
      'Modern codecs squeeze files dramatically while keeping the detail you actually care about.',
  },
  {
    icon: GitHubIcon,
    title: 'Free & open source',
    description:
      'No paywalls, no limits, no sign-up. The full source is on GitHub for anyone to inspect.',
  },
]

const formats = ['JPEG', 'PNG', 'WebP', 'AVIF', 'JXL', 'MP4', 'MOV', 'AVI']

const stats = [
  { value: '90%', label: 'Smaller files' },
  { value: '0', label: 'Bytes uploaded' },
  { value: '8+', label: 'Formats supported' },
  { value: '100%', label: 'Free & open' },
]

const steps: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: MousePointerClick,
    title: 'Pick a tool',
    description:
      'Choose background removal, image squish or video compress — each opens instantly, no install.',
  },
  {
    icon: Cpu,
    title: 'Process in your browser',
    description:
      'Your file is decoded and re-encoded on-device with WebGPU & WebAssembly. It never touches a server.',
  },
  {
    icon: Download,
    title: 'Download the result',
    description:
      'Grab the optimized file right away. Close the tab and nothing is left behind.',
  },
]

const faqs = [
  {
    q: 'Are my files uploaded anywhere?',
    a: 'No. Everything runs locally in your browser using WebGPU, WebAssembly and Web Workers. Your files never leave your device and nothing is stored on a server.',
  },
  {
    q: 'How much smaller will my files get?',
    a: 'It depends on the source, but images and videos can shrink by up to 90% with modern codecs while keeping visual quality. You stay in control of the quality/size trade-off.',
  },
  {
    q: 'Which formats are supported?',
    a: 'Images: JPEG, PNG, WebP, AVIF and JXL. Video compression outputs MP4 (H.264 / H.265). Most common input formats are accepted.',
  },
  {
    q: 'Do I need an account or to pay?',
    a: 'Neither. Clearify is completely free, requires no sign-up, and the full source code is available on GitHub.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes. Once the page has loaded and cached, the tools keep working without a network connection.',
  },
]

// Decorative corner ticks (brutalist accent) for feature cards.
function CardCorners() {
  const base =
    'pointer-events-none absolute size-2.5 border-white/25 transition-colors group-hover:border-white/50'
  return (
    <>
      <span className={cn(base, 'left-0 top-0 border-l border-t')} />
      <span className={cn(base, 'right-0 top-0 border-r border-t')} />
      <span className={cn(base, 'bottom-0 left-0 border-b border-l')} />
      <span className={cn(base, 'bottom-0 right-0 border-b border-r')} />
    </>
  )
}

export default function Home() {
  const toolsRef = useRef<HTMLDivElement>(null)

  const scrollToTools = () => {
    toolsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {/* Fixed atmospheric background */}
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

      <IKPageContainer className="relative">
        <div className="w-full max-w-6xl mx-auto py-10 md:py-16 space-y-24 md:space-y-32">
          {/* Hero */}
          <section className="flex min-h-[70vh] flex-col items-center justify-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.7)]" />
              100% on-device · No uploads
            </span>

            <GradientText className="mt-6 text-5xl md:text-7xl font-bold bg-linear-to-r">
              Clearify
            </GradientText>

            <div className="mt-5">
              <ShinyText
                text="Powerful web-based tools for your image & video editing needs"
                disabled={false}
                speed={3}
                className="text-base md:text-xl text-gray-600 dark:text-gray-300"
              />
            </div>

            <p className="mt-5 max-w-xl text-sm md:text-base text-muted-foreground">
              Remove backgrounds, compress images and shrink videos — all in
              your browser. Nothing is sent to a server, ever.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center gap-3">
              <Button
                size="lg"
                onClick={scrollToTools}
                className="border-none bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 px-7 text-white shadow-[0_8px_32px_rgba(31,38,135,0.35)] transition-transform hover:scale-[1.03]"
              >
                Explore the tools
                <ArrowRight />
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/20 bg-black/20 backdrop-blur-md hover:bg-black/30"
              >
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  <GitHubIcon className="size-4" />
                  Star on GitHub
                </a>
              </Button>
            </div>

            <div className="mt-8 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Sparkles className="size-4 text-amber-500" />
              All processing happens locally on your device.
            </div>
          </section>

          {/* Stats */}
          <section>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-[15px] sm:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-black/30 px-4 py-8 text-center"
                >
                  <div className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tools */}
          <section ref={toolsRef} className="scroll-mt-6">
            <div className="mb-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold">
                Pick a tool, get to work
              </h2>
              <p className="mt-3 text-muted-foreground">
                Three focused utilities. No setup, no upload, no waiting.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tasks.map((task) => (
                <Card
                  key={task.id}
                  className="group relative ring-0 bg-black/20 shadow-[0_8px_32px_rgba(31,38,135,0.15)] backdrop-blur-[15px] transition-all duration-300 hover:-translate-y-1 hover:bg-black/30 hover:shadow-[0_16px_48px_rgba(31,38,135,0.3)]"
                >
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'p-3 rounded-xl text-white transition-transform duration-300 group-hover:scale-110',
                          task.color,
                        )}
                      >
                        <task.icon size={22} />
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-xl font-bold">
                          {task.title}
                        </CardTitle>
                        {task.subtitle && (
                          <CardDescription>{task.subtitle}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col h-full">
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                    </p>
                    <div className="mt-auto pt-6">
                      <Link href={task.route} passHref>
                        <Button
                          className={cn(
                            'w-full border-none text-white',
                            task.color,
                          )}
                        >
                          Try it now
                          <ArrowRight className="transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Why Clearify */}
          <section>
            <div className="mb-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold">Why Clearify</h2>
              <p className="mt-3 text-muted-foreground">
                Privacy-first by design — speed and simplicity as a bonus.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group relative rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-[15px] transition-colors hover:border-white/20 hover:bg-black/30"
                >
                  <CardCorners />
                  <div className="flex size-11 items-center justify-center rounded-xl bg-white/5 text-foreground ring-1 ring-inset ring-white/10">
                    <feature.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section>
            <div className="mb-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold">How it works</h2>
              <p className="mt-3 text-muted-foreground">
                Three steps, zero servers.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {steps.map((step, i) => (
                <div
                  key={step.title}
                  className="relative rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-[15px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-white/5 text-foreground ring-1 ring-inset ring-white/10">
                      <step.icon className="size-5" />
                    </span>
                    <span className="font-mono text-4xl font-bold text-white/10">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Privacy + formats */}
          <section>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/25 p-8 md:p-12 text-center backdrop-blur-[15px]">
              <div
                className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[40rem] max-w-full -translate-x-1/2 rounded-full opacity-50 blur-3xl"
                style={{
                  background:
                    'radial-gradient(closest-side, rgba(76,0,255,0.4), rgba(255,61,154,0.2), transparent)',
                }}
              />
              <div className="relative">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/5 text-foreground ring-1 ring-inset ring-white/15">
                  <Lock className="size-6" />
                </div>
                <h2 className="mt-5 text-2xl md:text-3xl font-bold">
                  Your files never leave your browser
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                  There is no upload step. Files are decoded, transformed and
                  encoded entirely on your machine, then handed straight back to
                  you. Close the tab and nothing remains.
                </p>

                <div className="mt-7 flex flex-wrap justify-center gap-2">
                  {formats.map((format) => (
                    <span
                      key={format}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-foreground/80"
                    >
                      {format}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-12">
            <div className="md:sticky md:top-6 md:self-start">
              <h2 className="text-3xl md:text-4xl font-bold">
                Frequently asked
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Everything you might wonder before dropping in a file.
              </p>
            </div>
            <Accordion
              type="single"
              collapsible
              className="w-full border-t border-white/10"
            >
              {faqs.map((item) => (
                <AccordionItem
                  key={item.q}
                  value={item.q}
                  className="border-white/10"
                >
                  <AccordionTrigger className="text-left text-base">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Bottom CTA */}
          <section className="text-center">
            <GradientText className="text-3xl md:text-5xl font-bold bg-linear-to-r">
              Ready to clean up your media?
            </GradientText>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Jump straight into any tool — it loads in the browser and works
              offline once cached.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {tasks.map((task) => (
                <Link key={task.id} href={task.route} passHref>
                  <Button className={cn('border-none text-white', task.color)}>
                    <task.icon className="size-4" />
                    {task.title}
                  </Button>
                </Link>
              ))}
            </div>
          </section>

          <Footer />
        </div>
      </IKPageContainer>
    </>
  )
}
