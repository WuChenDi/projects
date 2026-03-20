'use client'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@cdlab996/ui/components/popover'
import { cn } from '@cdlab996/ui/lib/utils'
import { User, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useCharacterStore } from '@/stores/character-store'

export function CharacterPicker({
  selectedCharacterId,
  onSelect,
  disabled,
  className,
}: {
  selectedCharacterId: string | null
  onSelect: (characterId: string | null) => void
  disabled?: boolean
  className?: string
}) {
  const t = useTranslations()
  const { characters } = useCharacterStore()
  const [isOpen, setIsOpen] = useState(false)

  if (characters.length === 0) return null

  const selectedCharacter = selectedCharacterId
    ? characters.find((c) => c.id === selectedCharacterId)
    : null

  if (selectedCharacter) {
    return (
      <div className={cn('group/char relative', className)}>
        <button
          type="button"
          className="bg-muted/50 flex w-full items-center gap-2 overflow-hidden rounded-md border p-1.5"
          onClick={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') setIsOpen(true)
          }}
          disabled={disabled}
        >
          {selectedCharacter.thumbnailDataUrl ? (
            /* biome-ignore lint: data URL thumbnail */
            <img
              src={selectedCharacter.thumbnailDataUrl}
              alt={selectedCharacter.name}
              className="size-8 rounded object-cover"
            />
          ) : (
            <div className="bg-muted flex size-8 items-center justify-center rounded">
              <User className="text-muted-foreground size-4" />
            </div>
          )}
          <span className="text-foreground truncate text-xs font-medium">
            {selectedCharacter.name}
          </span>
        </button>
        <button
          type="button"
          className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 opacity-0 transition-opacity hover:bg-black/80 group-hover/char:opacity-100"
          title={t('characters.removeReference')}
          onClick={(event) => {
            event.stopPropagation()
            onSelect(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.stopPropagation()
              onSelect(null)
            }
          }}
        >
          <X className="size-3 text-white" />
        </button>
      </div>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'bg-muted/30 hover:bg-muted/60 flex w-full items-center gap-2 rounded-md border border-dashed p-2 transition-colors',
            className,
          )}
          disabled={disabled}
        >
          <User className="text-muted-foreground size-4 shrink-0" />
          <span className="text-muted-foreground truncate text-xs">
            {t('characters.useAsReference')}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto">
          {characters.map((character) => (
            <button
              key={character.id}
              type="button"
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent transition-colors',
                character.images.length === 0 &&
                  'opacity-50 cursor-not-allowed',
              )}
              disabled={character.images.length === 0}
              onClick={() => {
                onSelect(character.id)
                setIsOpen(false)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onSelect(character.id)
                  setIsOpen(false)
                }
              }}
            >
              {character.thumbnailDataUrl ? (
                /* biome-ignore lint: data URL thumbnail */
                <img
                  src={character.thumbnailDataUrl}
                  alt={character.name}
                  className="size-8 rounded object-cover shrink-0"
                />
              ) : (
                <div className="bg-muted flex size-8 items-center justify-center rounded shrink-0">
                  <User className="text-muted-foreground size-4" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-foreground truncate text-xs font-medium">
                  {character.name}
                </span>
                {character.images.length === 0 && (
                  <span className="text-muted-foreground text-[10px]">
                    {t('ai.noReferenceImages')}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
