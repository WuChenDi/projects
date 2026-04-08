'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@cdlab996/ui/components/drawer'
import { IKConfirmDialog } from '@cdlab996/ui/IK'
import { TrashIcon, XIcon } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useFavoritesStore, usePremiumFavoritesStore } from '@/lib/store/favorites-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { FavoritesList } from './FavoritesList'

export function FavoritesSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isPremium = pathname === '/premium' || searchParams.get('premium') === '1'

  const { favoritesOpen, setFavoritesOpen } = useSidebarStore()
  const normalStore = useFavoritesStore()
  const premiumStore = usePremiumFavoritesStore()
  const { favorites, removeFavorite, clearFavorites } = isPremium ? premiumStore : normalStore

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    videoId?: string
    source?: string
    isClearAll?: boolean
  }>({ isOpen: false })

  const handleDeleteItem = (videoId: string | number, source: string) => {
    setDeleteConfirm({ isOpen: true, videoId: String(videoId), source })
  }

  const confirmDelete = () => {
    if (deleteConfirm.isClearAll) {
      clearFavorites()
    } else if (deleteConfirm.videoId && deleteConfirm.source) {
      removeFavorite(deleteConfirm.videoId, deleteConfirm.source)
    }
    setDeleteConfirm({ isOpen: false })
  }

  return (
    <>
      <Drawer open={favoritesOpen} onOpenChange={setFavoritesOpen} direction="right">
        <DrawerContent className="flex flex-col">
          <DrawerHeader className="flex-row items-center justify-between border-b">
            <DrawerTitle>我的收藏</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon-xs">
                <XIcon className="size-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4">
            <FavoritesList
              favorites={favorites}
              onRemove={handleDeleteItem}
              isPremium={isPremium}
            />
          </div>

          {favorites.length > 0 && (
            <DrawerFooter className="border-t">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm({ isOpen: true, isClearAll: true })}
                className="w-full"
              >
                <TrashIcon className="size-4" />
                清空收藏
              </Button>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>

      <IKConfirmDialog
        open={deleteConfirm.isOpen}
        title={deleteConfirm.isClearAll ? '清空收藏夹' : '取消收藏'}
        description={
          deleteConfirm.isClearAll
            ? '确定要清空所有收藏吗？此操作无法撤销。'
            : '确定要取消收藏这个视频吗？'
        }
        onConfirm={confirmDelete}
        onOpenChange={(open) => !open && setDeleteConfirm({ isOpen: false })}
        confirmText="确定"
        cancelText="取消"
      />
    </>
  )
}
