'use client'

import { IKConfirmDialog, IKPageContainer } from '@cdlab996/ui/IK'
import { useSettingsPage } from '@/app/settings/hooks/useSettingsPage'
import { AddSourceModal } from '@/components/settings/AddSourceModal'
import { DataSettings } from '@/components/settings/DataSettings'
import { DisplaySettings } from '@/components/settings/DisplaySettings'
import { ExportModal } from '@/components/settings/ExportModal'
import { ImportModal } from '@/components/settings/ImportModal'
import { PasswordSettings } from '@/components/settings/PasswordSettings'
import { PlayerSettings } from '@/components/settings/PlayerSettings'
import { SortSettings } from '@/components/settings/SortSettings'
import { SourceSettings } from '@/components/settings/SourceSettings'

interface SettingsPageContentProps {
  isPremium?: boolean
}

export function SettingsPageContent({
  isPremium = false,
}: SettingsPageContentProps) {
  const {
    sources,
    sortBy,
    envPasswordSet,
    realtimeLatency,
    searchDisplayMode,
    fullscreenType,
    isAddModalOpen,
    isExportModalOpen,
    isImportModalOpen,
    isResetDialogOpen,
    isRestoreDefaultsDialogOpen,
    setIsAddModalOpen,
    setIsExportModalOpen,
    setIsImportModalOpen,
    setIsResetDialogOpen,
    setIsRestoreDefaultsDialogOpen,
    handleSourcesChange,
    handleAddSource,
    handleSortChange,
    handleExport,
    handleImportFile,
    handleImportLink,
    subscriptions,
    handleAddSubscription,
    handleRemoveSubscription,
    handleRefreshSubscription,
    handleToggleAutoRefresh,
    handleRestoreDefaults,
    handleResetAll,
    editingSource,
    handleEditSource,
    setEditingSource,
    handleRealtimeLatencyChange,
    handleSearchDisplayModeChange,
    handleFullscreenTypeChange,
    proxyMode,
    handleProxyModeChange,
    playerEngine,
    handlePlayerEngineChange,
    rememberScrollPosition,
    handleRememberScrollPositionChange,
    adFilterMode,
    adKeywords,
    handleAdFilterModeChange,
    handleAdKeywordsChange,
  } = useSettingsPage({ isPremium })

  return (
    <>
      <IKPageContainer>
        <div className="max-w-4xl mx-auto w-full space-y-4 pb-8">
          {/* Player Settings */}
          <PlayerSettings
            fullscreenType={fullscreenType}
            onFullscreenTypeChange={handleFullscreenTypeChange}
            proxyMode={proxyMode}
            onProxyModeChange={handleProxyModeChange}
            playerEngine={playerEngine}
            onPlayerEngineChange={handlePlayerEngineChange}
            adFilterMode={adFilterMode}
            adKeywords={adKeywords}
            onAdFilterModeChange={handleAdFilterModeChange}
            onAdKeywordsChange={handleAdKeywordsChange}
          />

          {/* Password Settings (env-only info card) */}
          {envPasswordSet && <PasswordSettings />}

          {/* Display Settings */}
          <DisplaySettings
            realtimeLatency={realtimeLatency}
            searchDisplayMode={searchDisplayMode}
            rememberScrollPosition={rememberScrollPosition}
            onRealtimeLatencyChange={handleRealtimeLatencyChange}
            onSearchDisplayModeChange={handleSearchDisplayModeChange}
            onRememberScrollPositionChange={handleRememberScrollPositionChange}
          />

          {/* Source Management */}
          <SourceSettings
            sources={sources}
            onSourcesChange={handleSourcesChange}
            onRestoreDefaults={() => setIsRestoreDefaultsDialogOpen(true)}
            onAddSource={() => {
              setEditingSource(null)
              setIsAddModalOpen(true)
            }}
            onEditSource={handleEditSource}
            isPremium={isPremium}
          />

          {/* Sort Options */}
          <SortSettings sortBy={sortBy} onSortChange={handleSortChange} />

          {/* Data Management */}
          <DataSettings
            onExport={() => setIsExportModalOpen(true)}
            onImport={() => setIsImportModalOpen(true)}
            onReset={() => setIsResetDialogOpen(true)}
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
        existingIds={sources.map((s) => s.id)}
        initialValues={editingSource}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportFile={handleImportFile}
        onImportLink={handleImportLink}
        subscriptions={subscriptions}
        onAddSubscription={handleAddSubscription}
        onRemoveSubscription={handleRemoveSubscription}
        onRefreshSubscription={handleRefreshSubscription}
        onToggleAutoRefresh={handleToggleAutoRefresh}
      />

      <IKConfirmDialog
        open={isRestoreDefaultsDialogOpen}
        title="恢复默认源"
        description="这将重置所有视频源为默认配置。自定义源将被删除。是否继续？"
        confirmText="恢复"
        cancelText="取消"
        onConfirm={handleRestoreDefaults}
        onOpenChange={(open) => !open && setIsRestoreDefaultsDialogOpen(false)}
      />

      <IKConfirmDialog
        open={isResetDialogOpen}
        title="清除所有数据"
        description="这将删除所有设置、历史记录、Cookie 和缓存。此操作不可撤销。是否继续？"
        confirmText="清除"
        cancelText="取消"
        onConfirm={handleResetAll}
        onOpenChange={(open) => !open && setIsResetDialogOpen(false)}
      />
    </>
  )
}
