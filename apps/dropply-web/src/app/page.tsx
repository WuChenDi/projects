import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { cn } from '@cdlab996/ui/lib/utils'
import Aurora from '@cdlab996/ui/reactbits/Aurora'
import GradientText from '@cdlab996/ui/reactbits/GradientText'
import Particles from '@cdlab996/ui/reactbits/Particles'
import ShinyText from '@cdlab996/ui/reactbits/ShinyText'
import SplashCursor from '@cdlab996/ui/reactbits/SplashCursor'
import {
  ArrowRight,
  Clock,
  Download,
  Shield,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Footer, PageContainer } from '@/components/layout'

interface Task {
  id: string
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  colorClass: string
  route: string
  features: string[]
}

const TASKS: Task[] = [
  {
    id: 'share',
    title: 'Share Files',
    subtitle: 'Start Sharing',
    description:
      'Upload files or text content to generate a secure retrieval code. Set expiry time and share with anyone.',
    icon: Upload,
    colorClass: 'bg-gradient-to-r from-purple-500 to-blue-500',
    route: '/share',
    features: [
      'Drag & drop upload',
      'Custom expiry time',
      'Password protection',
    ],
  },
  {
    id: 'retrieve',
    title: 'Retrieve Files',
    subtitle: 'Enter Code',
    description:
      'Have a retrieval code? Enter it here to access and download shared files and text content.',
    icon: Download,
    colorClass: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    route: '/retrieve',
    features: ['Quick access', 'Secure download', 'Preview support'],
  },
]

const FEATURES = [
  {
    icon: Shield,
    text: 'End-to-end encrypted',
  },
  {
    icon: Clock,
    text: 'Auto-delete after expiry',
  },
  {
    icon: Zap,
    text: 'No account required',
  },
]

export default function Home() {
  return (
    <>
      <div className="h-[calc(100dvh-80px)] flex-1 flex flex-col">
        <PageContainer scrollable={false} className="relative">
          <div className="relative w-full max-w-4xl mx-auto space-y-12 z-1">
            <div className="text-center mb-8">
              <GradientText className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r">
                Dropply
              </GradientText>
              <div className="mt-6">
                <ShinyText
                  text="Share files instantly with military-grade encryption. No accounts, no tracking, just pure privacy."
                  disabled={false}
                  speed={3}
                  className="text-base md:text-lg text-gray-600 dark:text-gray-300"
                />
              </div>
              <div className="mt-4 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-amber-500 mr-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Files are automatically deleted after expiry. No account
                  required.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {FEATURES.map((feature, index) => {
                const IconComponent = feature.icon
                return (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
                    key={index}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full',
                      'bg-card/50 backdrop-blur-sm border border-border/30',
                    )}
                  >
                    <IconComponent size={16} className="text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {feature.text}
                    </span>
                  </div>
                )
              })}
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {TASKS.map((task) => {
                return (
                  <Card
                    key={task.id}
                    className="relative ring-0 bg-black/20 shadow-[0_8px_32px_rgba(31,38,135,0.15)] backdrop-blur-[15px]"
                    // className="relative ring-1 bg-transparent"
                  >
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className={cn('p-3 rounded-xl', task.colorClass)}>
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
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        {task.description}
                      </p>

                      <div className="space-y-2 mb-6">
                        {task.features.map((feature, index) => (
                          <div
                            // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
                            key={index}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <div
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                `bg-gradient-to-r ${task.colorClass}`,
                              )}
                            />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-auto">
                        <Link href={task.route} passHref>
                          <Button
                            className={cn(
                              'w-full border-none',
                              task.colorClass,
                            )}
                          >
                            <span className="mr-2">Get Started</span>
                            <ArrowRight
                              size={18}
                              className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </section>
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
