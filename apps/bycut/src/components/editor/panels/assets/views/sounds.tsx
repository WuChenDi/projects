'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Input } from '@cdlab996/ui/components/input'
import { ScrollArea } from '@cdlab996/ui/components/scroll-area'
import { Pause, Play, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { STATIC_SOUND_EFFECTS } from '@/constants/sounds-data'
import { useSoundsStore } from '@/stores/sounds-store'
import type { SoundEffect } from '@/types/sounds'

export function SoundsView() {
  const t = useTranslations()
  const { searchQuery, setSearchQuery } = useSoundsStore()

  const [playingId, setPlayingId] = useState<number | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  )

  const displayedSounds = useMemo(() => {
    if (!searchQuery.trim()) return STATIC_SOUND_EFFECTS
    const lowerQuery = searchQuery.toLowerCase()
    return STATIC_SOUND_EFFECTS.filter(
      (sound) =>
        sound.name.toLowerCase().includes(lowerQuery) ||
        sound.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        sound.username.toLowerCase().includes(lowerQuery),
    )
  }, [searchQuery])

  const playSound = ({ sound }: { sound: SoundEffect }) => {
    if (playingId === sound.id) {
      audioElement?.pause()
      setPlayingId(null)
      return
    }

    audioElement?.pause()

    if (sound.previewUrl) {
      const audio = new Audio(sound.previewUrl)
      audio.addEventListener('ended', () => {
        setPlayingId(null)
      })
      audio.addEventListener('error', () => {
        setPlayingId(null)
      })
      audio.play().catch((error: DOMException) => {
        if (error.name === 'AbortError') return
        console.error('Failed to play sound preview:', error)
        setPlayingId(null)
      })

      setAudioElement(audio)
      setPlayingId(sound.id)
    }
  }

  return (
    <div className="flex h-full flex-col gap-5 p-4">
      <Input
        placeholder={t('sounds.search')}
        value={searchQuery}
        onChange={({ currentTarget }) =>
          setSearchQuery({ query: currentTarget.value })
        }
      />

      <div className="relative h-full overflow-hidden">
        <ScrollArea className="h-full flex-1 [&>[data-slot=scroll-area-viewport]>div]:!block">
          <div className="flex flex-col gap-4">
            {displayedSounds.map((sound) => (
              <AudioItem
                key={sound.id}
                sound={sound}
                isPlaying={playingId === sound.id}
                onPlay={playSound}
              />
            ))}
            {displayedSounds.length === 0 && (
              <div className="text-muted-foreground text-sm">
                {searchQuery ? t('sounds.notFound') : t('sounds.noAvailable')}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

interface AudioItemProps {
  sound: SoundEffect
  isPlaying: boolean
  onPlay: ({ sound }: { sound: SoundEffect }) => void
}

function AudioItem({ sound, isPlaying, onPlay }: AudioItemProps) {
  const t = useTranslations()
  const { addSoundToTimeline } = useSoundsStore()

  const handleClick = () => {
    onPlay({ sound })
  }

  const handleAddToTimeline = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation()
    await addSoundToTimeline({ sound })
  }

  return (
    <div className="group flex items-center gap-3 opacity-100 hover:opacity-75">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={handleClick}
      >
        <div className="bg-accent relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md">
          <div className="from-primary/20 absolute inset-0 bg-linear-to-br to-transparent" />
          {isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{sound.name}</p>
          <span className="text-muted-foreground block truncate text-[10px]">
            {sound.username}
          </span>
        </div>
      </button>

      <div className="flex items-center gap-3 pr-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddToTimeline}
          title={t('timeline.addToTimeline')}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}
