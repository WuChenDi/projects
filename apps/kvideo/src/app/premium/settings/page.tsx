'use client'

import { IKConfirmDialog, IKPageContainer } from '@cdlab996/ui/IK'
import { Header } from '@/components/layout'
import { AddSourceModal } from '@/components/settings/AddSourceModal'
import { PremiumSourceSettings } from '@/components/settings/PremiumSourceSettings'
import { usePremiumSettingsPage } from './hooks/usePremiumSettingsPage'

export default function PremiumSettingsPage() {
  const {
    premiumSources,
    isAddModalOpen,
    isRestoreDefaultsDialogOpen,
    setIsAddModalOpen,
    setIsRestoreDefaultsDialogOpen,
    handleSourcesChange,
    handleAddSource,
    handleRestoreDefaults,
    editingSource,
    handleEditSource,
    setEditingSource,
  } = usePremiumSettingsPage()

  return (
    <div className="min-h-screen bg-black">
      <Header isPremiumMode={true} />
      <IKPageContainer>
        <div className="max-w-4xl mx-auto w-full space-y-8 pb-8">
          <PremiumSourceSettings
            sources={premiumSources}
            onSourcesChange={handleSourcesChange}
            onRestoreDefaults={() => setIsRestoreDefaultsDialogOpen(true)}
            onAddSource={() => {
              setEditingSource(null)
              setIsAddModalOpen(true)
            }}
            onEditSource={handleEditSource}
          />
        </div>
      </IKPageContainer>

      {/* Modals */}
      <AddSourceModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingSource(null)
        }}
        onAdd={handleAddSource}
        existingIds={premiumSources.map((s) => s.id)}
        initialValues={editingSource}
      />

      <IKConfirmDialog
        open={isRestoreDefaultsDialogOpen}
        title="恢复默认高级源"
        description="这将重置所有高级源为默认配置。自定义源将被删除。是否继续？"
        confirmText="恢复"
        cancelText="取消"
        onConfirm={handleRestoreDefaults}
        onOpenChange={(open) => !open && setIsRestoreDefaultsDialogOpen(false)}
      />
    </div>
  )
}
