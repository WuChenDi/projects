'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@cdlab996/ui/components/dialog'
import { ScrollArea } from '@cdlab996/ui/components/scroll-area'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@cdlab996/ui/components/tabs'
import { Button } from '@cdlab996/ui/components/button'
import { Input } from '@cdlab996/ui/components/input'
import { Alert, AlertDescription } from '@cdlab996/ui/components/alert'
import { Spinner } from '@cdlab996/ui/components/spinner'
import { CheckCircle2Icon, UploadIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { SourceSubscription } from '@/lib/types'
import type { ImportResult } from '@/lib/utils/source-import-utils'
import {
  fetchSourcesFromUrl,
  createSubscription,
} from '@/lib/utils/source-import-utils'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportFile: (jsonString: string) => Promise<boolean> | boolean
  onImportLink: (result: ImportResult) => Promise<boolean> | boolean
  subscriptions: SourceSubscription[]
  onAddSubscription: (sub: SourceSubscription) => Promise<boolean> | boolean
  onRemoveSubscription: (id: string) => void
  onRefreshSubscription: (sub: SourceSubscription) => Promise<void>
}

// ─── File Import ──────────────────────────────────────────────────────────────

function FileImportTab({
  onImport,
}: {
  onImport: (content: string) => Promise<boolean> | boolean
}) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setSuccess(false)

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string
        const result = await onImport(content)
        if (result) {
          setSuccess(true)
        } else {
          setError('导入失败：文件格式无效')
        }
      } catch (err) {
        console.error(err)
        setError('导入失败：无法读取文件或格式错误')
      }
    }
    reader.readAsText(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <p className="text-muted-foreground text-sm">
        选择之前导出的设置文件（JSON 配置文件）。支持新旧版本格式。
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={success}
        className="w-full h-24 border-dashed flex-col gap-2"
      >
        <UploadIcon className="size-5" />
        <span>点击选择文件</span>
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2Icon className="size-4 text-green-500" />
          <AlertDescription className="text-green-600">
            导入成功！正在刷新...
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// ─── Link Import ──────────────────────────────────────────────────────────────

function LinkImportTab({
  onImport,
}: {
  onImport: (result: ImportResult) => Promise<boolean> | boolean
}) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFetch = async () => {
    if (!url.trim()) return

    setLoading(true)
    setError('')
    setPreview(null)
    setSuccess(false)

    try {
      const result = await fetchSourcesFromUrl(url)
      setPreview(result)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : '获取链接失败，请检查URL是否正确或是否存在跨域限制',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!preview) return

    try {
      const result = await onImport(preview)
      if (result) {
        setSuccess(true)
        setPreview(null)
        setUrl('')
      } else {
        setError('导入处理失败')
      }
    } catch {
      setError('导入过程发生错误')
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <label className="text-sm font-medium mb-2 block">源配置链接</label>
        <div className="flex gap-2">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/sources.json"
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            disabled={loading || success}
          />
          <Button
            onClick={handleFetch}
            disabled={!url.trim() || loading || success}
            className="min-w-[80px]"
          >
            {loading ? <Spinner /> : '获取'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          支持 JSON 配置文件格式的单个或多个源配置链接
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {preview && (
        <div className="border rounded-lg p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <p className="font-semibold text-sm flex items-center gap-1.5">
            <CheckCircle2Icon className="size-4 text-primary" />
            解析成功
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded-lg p-3">
              <span className="text-xs text-muted-foreground block">普通源</span>
              <span className="text-xl font-bold">{preview.normalSources.length}</span>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <span className="text-xs text-muted-foreground block">成人源</span>
              <span className="text-xl font-bold">{preview.premiumSources.length}</span>
            </div>
          </div>
          <Button onClick={handleConfirmImport} className="w-full">
            确认导入 {preview.totalCount} 个源
          </Button>
        </div>
      )}

      {success && (
        <Alert>
          <CheckCircle2Icon className="size-4 text-green-500" />
          <AlertDescription className="text-green-600">
            导入成功！正在刷新...
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// ─── Subscription Import ──────────────────────────────────────────────────────

function SubscriptionImportTab({
  subscriptions,
  onAdd,
  onRemove,
  onRefresh,
}: {
  subscriptions: SourceSubscription[]
  onAdd: (subscription: SourceSubscription) => Promise<boolean> | boolean
  onRemove: (id: string) => void
  onRefresh: (subscription: SourceSubscription) => Promise<void>
}) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  const handleAdd = async () => {
    if (!url.trim() || !name.trim()) {
      setError('请输入订阅名称和链接')
      return
    }

    setLoading(true)
    setError('')

    try {
      const newSub = createSubscription(name, url)
      await onAdd(newSub)
      setUrl('')
      setName('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '添加订阅失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAddKeydown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleAdd()
  }

  const handleRefresh = async (sub: SourceSubscription) => {
    setRefreshingIds((prev) => new Set(prev).add(sub.id))
    try {
      await onRefresh(sub)
    } finally {
      setRefreshingIds((prev) => {
        const next = new Set(prev)
        next.delete(sub.id)
        return next
      })
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Add New Subscription */}
      <div className="border rounded-lg p-4 space-y-3">
        <p className="font-semibold text-sm">添加新订阅</p>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="订阅名称 (例如: 每日更新源)"
          onKeyDown={handleAddKeydown}
        />
        <div className="flex gap-2">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="订阅链接 (URL)"
            onKeyDown={handleAddKeydown}
          />
          <Button
            onClick={handleAdd}
            disabled={loading || !url.trim() || !name.trim()}
            className="min-w-[72px]"
          >
            {loading ? <Spinner /> : '添加'}
          </Button>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Subscription List */}
      {subscriptions.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">暂无订阅</p>
      ) : (
        <div className="space-y-2">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/50 transition-colors"
            >
              <div className="overflow-hidden mr-3">
                <p className="font-medium text-sm truncate">{sub.name}</p>
                <p className="text-xs text-muted-foreground truncate" title={sub.url}>
                  {sub.url}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  上次更新: {new Date(sub.lastUpdated).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRefresh(sub)}
                  disabled={refreshingIds.has(sub.id)}
                  title="立即更新"
                >
                  {refreshingIds.has(sub.id) ? (
                    <Spinner />
                  ) : (
                    <RefreshCwIcon className="size-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRemove(sub.id)}
                  title="删除订阅"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

export function ImportModal({
  isOpen,
  onClose,
  onImportFile,
  onImportLink,
  subscriptions,
  onAddSubscription,
  onRemoveSubscription,
  onRefreshSubscription,
}: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'link' | 'subscription'>(
    'file',
  )

  useEffect(() => {
    if (isOpen) setActiveTab('file')
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>导入设置</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            setActiveTab(v as 'file' | 'link' | 'subscription')
          }
          className="w-full"
        >
          <div className="px-6">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="file">文件导入</TabsTrigger>
              <TabsTrigger value="link">链接导入</TabsTrigger>
              <TabsTrigger value="subscription">订阅管理</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="max-h-[65vh] px-6 py-4">
            <TabsContent value="file">
              <FileImportTab onImport={onImportFile} />
            </TabsContent>

            <TabsContent value="link">
              <LinkImportTab onImport={onImportLink} />
            </TabsContent>

            <TabsContent value="subscription">
              <SubscriptionImportTab
                subscriptions={subscriptions}
                onAdd={onAddSubscription}
                onRemove={onRemoveSubscription}
                onRefresh={onRefreshSubscription}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
