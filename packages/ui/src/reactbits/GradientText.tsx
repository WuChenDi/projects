'use client'

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useTransform,
} from 'motion/react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface GradientTextProps {
  children: ReactNode
  className?: string
  colors?: string[]
  animationSpeed?: number
  showBorder?: boolean
  direction?: 'horizontal' | 'vertical' | 'diagonal'
  pauseOnHover?: boolean
  yoyo?: boolean
}

export default function GradientText({
  children,
  className = '',
  colors = ['#5227FF', '#FF9FFC', '#B497CF'],
  animationSpeed = 8,
  showBorder = false,
  direction = 'horizontal',
  pauseOnHover = false,
  yoyo = true,
}: GradientTextProps) {
  const [isPaused, setIsPaused] = useState(false)
  const progress = useMotionValue(0)
  const elapsedRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)

  const animationDuration = animationSpeed * 1000

  useAnimationFrame((time) => {
    if (isPaused) {
      lastTimeRef.current = null
      return
    }

    if (lastTimeRef.current === null) {
      lastTimeRef.current = time
      return
    }

    const deltaTime = time - lastTimeRef.current
    lastTimeRef.current = time
    elapsedRef.current += deltaTime

    if (yoyo) {
      const fullCycle = animationDuration * 2
      const cycleTime = elapsedRef.current % fullCycle

      if (cycleTime < animationDuration) {
        progress.set((cycleTime / animationDuration) * 100)
      } else {
        progress.set(
          100 - ((cycleTime - animationDuration) / animationDuration) * 100,
        )
      }
    } else {
      progress.set((elapsedRef.current / animationDuration) * 100)
    }
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the animation timeline whenever speed/direction changes
  useEffect(() => {
    elapsedRef.current = 0
    progress.set(0)
  }, [animationSpeed, yoyo])

  const backgroundPosition = useTransform(progress, (p) => {
    if (direction === 'vertical') return `50% ${p}%`
    return `${p}% 50%`
  })

  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) setIsPaused(true)
  }, [pauseOnHover])

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) setIsPaused(false)
  }, [pauseOnHover])

  const gradientAngle =
    direction === 'horizontal'
      ? 'to right'
      : direction === 'vertical'
        ? 'to bottom'
        : 'to bottom right'
  const gradientColors = [...colors, colors[0]].join(', ')

  const gradientStyle = {
    backgroundImage: `linear-gradient(${gradientAngle}, ${gradientColors})`,
    backgroundSize:
      direction === 'horizontal'
        ? '300% 100%'
        : direction === 'vertical'
          ? '100% 300%'
          : '300% 300%',
    backgroundRepeat: 'repeat',
  }

  return (
    <motion.div
      className={`relative mx-auto flex max-w-fit flex-row items-center justify-center overflow-hidden rounded-[1.25rem] font-medium backdrop-blur transition-shadow duration-500 ${showBorder ? 'px-2 py-1' : ''} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showBorder && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 rounded-[1.25rem]"
          style={{ ...gradientStyle, backgroundPosition }}
        >
          <div
            className="absolute z-[-1] rounded-[1.25rem] bg-background"
            style={{
              width: 'calc(100% - 2px)',
              height: 'calc(100% - 2px)',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </motion.div>
      )}
      <motion.div
        className="z-2 inline-block bg-clip-text text-transparent"
        style={{
          ...gradientStyle,
          backgroundPosition,
          WebkitBackgroundClip: 'text',
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
