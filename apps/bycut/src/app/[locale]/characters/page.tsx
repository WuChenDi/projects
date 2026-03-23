'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@cdlab996/ui/components/alert-dialog'
import { Button } from '@cdlab996/ui/components/button'
import { Input } from '@cdlab996/ui/components/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@cdlab996/ui/components/input-group'
import { IKEmpty } from '@cdlab996/ui/IK/IKEmpty'
import { ArrowLeft, Plus, Search, User } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { CharacterCard } from '@/components/characters/character-card'
import { CharacterCreatorDialog } from '@/components/characters/character-creator'
import { CharacterDetailDialog } from '@/components/characters/character-detail'
import {
  LanguageSelector as LanguageToggle,
  ThemeToggle,
} from '@/components/layout'
import { Link } from '@/lib/navigation'
import { useCharacterStore } from '@/stores/character-store'
import type { AICharacter } from '@/types/character'

export default function CharactersPage() {
  const t = useTranslations()
  const { characters, deleteCharacter } = useCharacterStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<AICharacter | null>(
    null,
  )
  const [viewingCharacter, setViewingCharacter] = useState<AICharacter | null>(
    null,
  )
  const [deletingCharacter, setDeletingCharacter] =
    useState<AICharacter | null>(null)

  const filteredCharacters = searchQuery.trim()
    ? characters.filter(
        (character) =>
          character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          character.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    : characters

  const handleDeleteConfirm = () => {
    if (deletingCharacter) {
      deleteCharacter({ id: deletingCharacter.id })
      if (viewingCharacter?.id === deletingCharacter.id) {
        setViewingCharacter(null)
      }
      setDeletingCharacter(null)
    }
  }

  const handleEditFromDetail = () => {
    if (viewingCharacter) {
      setEditingCharacter(viewingCharacter)
      setViewingCharacter(null)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 px-8 flex flex-col gap-2">
        <div className="flex items-center justify-between h-16 pt-2">
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="https://notes-wudi.pages.dev/images/logo.png"
                alt="wudi Logo"
                width={24}
                height={24}
              />
              <span className="text-base font-bold tracking-tight">ByCut</span>
            </Link>
            <Link href="/projects">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1"
              >
                <ArrowLeft className="size-4" />
                {t('nav.allProjects')}
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <LanguageToggle />
            <ThemeToggle />
            <div className={'relative hidden md:block'}>
              <InputGroup>
                <InputGroupInput
                  placeholder={t('common.searchPlaceholder')}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <InputGroupAddon align="inline-start">
                  <Search className="size-4" />
                </InputGroupAddon>
              </InputGroup>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') setIsCreateOpen(true)
              }}
            >
              <span className="text-sm font-medium hidden md:block">
                {t('characters.new')}
              </span>
              <span className="text-sm font-medium block md:hidden">
                {t('common.new')}
              </span>
            </Button>
          </div>
        </div>

        <div className="relative block md:hidden mb-4">
          <Search
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            placeholder={t('common.searchPlaceholder')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-10 px-4 text-base file:h-8 file:text-sm md:text-sm pl-9"
          />
        </div>
      </header>

      <main className="mx-auto px-4 pt-2 pb-6 flex flex-col gap-4">
        {filteredCharacters.length === 0 ? (
          <EmptyState
            hasSearch={searchQuery.trim().length > 0}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery('')}
            onCreateNew={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="xs:grid-cols-2 grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-4 px-4">
            {filteredCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onClick={() => setViewingCharacter(character)}
                onEdit={() => setEditingCharacter(character)}
                onDelete={() => setDeletingCharacter(character)}
              />
            ))}
          </div>
        )}
      </main>

      <CharacterCreatorDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      <CharacterCreatorDialog
        key={editingCharacter?.id}
        isOpen={editingCharacter !== null}
        onOpenChange={(open) => {
          if (!open) setEditingCharacter(null)
        }}
        editCharacter={editingCharacter}
      />

      <CharacterDetailDialog
        character={viewingCharacter}
        isOpen={viewingCharacter !== null}
        onOpenChange={(open) => {
          if (!open) setViewingCharacter(null)
        }}
        onEdit={handleEditFromDetail}
      />

      <AlertDialog
        open={deletingCharacter !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingCharacter(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('characters.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('characters.deleteConfirm', {
                name: deletingCharacter?.name!,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EmptyState({
  hasSearch,
  searchQuery,
  onClearSearch,
  onCreateNew,
}: {
  hasSearch: boolean
  searchQuery: string
  onClearSearch: () => void
  onCreateNew: () => void
}) {
  const t = useTranslations()

  if (hasSearch) {
    return (
      <IKEmpty
        icon={Search}
        title={t('common.noResults')}
        description={t('projects.searchNoResults', { query: searchQuery })}
        className="py-16"
      >
        <Button onClick={onClearSearch} variant="outline" size="lg">
          {t('projects.clearSearch')}
        </Button>
      </IKEmpty>
    )
  }

  return (
    <IKEmpty
      icon={User}
      title={t('characters.noCharacters')}
      description={t('characters.description')}
      className="py-16"
    >
      <Button size="lg" className="gap-2" onClick={onCreateNew}>
        <Plus />
        {t('characters.createFirst')}
      </Button>
    </IKEmpty>
  )
}
