import { Button } from '@cdlab/ui/components/button'
import { CopyButton } from '@cdlab/ui/components/copy-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@cdlab/ui/components/dialog'
import { Input } from '@cdlab/ui/components/input'
import { Label } from '@cdlab/ui/components/label'
import { IKAssetFailed, IKAssetLoading, IKAssetRenderer } from '@cdlab/ui/IK'
import { cn } from '@cdlab/ui/lib/utils'
import { copyToClipboard, formatFileSize } from '@cdlab/utils'
import {
  CheckCircle,
  Copy,
  Download,
  Eye,
  FileText,
  Loader2,
  Lock,
  Mail,
  Share2,
  Unlock,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { PocketChestAPI } from '@/lib'
import { getFileIcon } from '@/lib/fileIcon'
import { ShareTooLargeError, shareEncryptedBlob } from '@/lib/share-blob'
import { useAuthStore } from '@/store/useAuthStore'
import type { ProcessResult } from '@/types/crypto'
import { InputModeEnum, ModeEnum } from '@/types/crypto'
import { EmailShare } from '../EmailShare'
import { LocalResultDialog } from './LocalResultDialog'

interface LocalResultCardProps {
  result: ProcessResult
  onDownload: (result: ProcessResult) => void
  onRemove: (id: string) => void
}

export function LocalResultCard({
  result,
  onDownload,
  onRemove,
}: LocalResultCardProps) {
  const t = useTranslations('localCrypto')
  const isMessage = result.inputMode === InputModeEnum.MESSAGE
  const isEncrypt = result.mode === ModeEnum.ENCRYPT
  const [dialogOpen, setDialogOpen] = useState(false)

  // Share = upload this finished ciphertext and get a retrieval code + link.
  const [shareOpen, setShareOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [share, setShare] = useState<{ code: string; url: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Server-side share password gate (SHARE_PASSWORD on the API).
  const { sharePassword, setSharePassword, clearSharePassword } = useAuthStore()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordInvalid, setPasswordInvalid] = useState(false)

  // Email share (only offered when the server enables it).
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)

  const doShare = async (password?: string) => {
    setSharing(true)
    try {
      const blob = new Blob([result.data], { type: 'application/octet-stream' })
      const res = await shareEncryptedBlob(blob, password)
      if (password) setSharePassword(password)
      setShare(res)
      setPasswordOpen(false)
      setPasswordInput('')
      setPasswordInvalid(false)
      setShareOpen(true)
    } catch (err) {
      if ((err as Error & { status?: number }).status === 401) {
        clearSharePassword()
        setPasswordInput('')
        setPasswordInvalid(true)
        setPasswordOpen(true)
      } else if (err instanceof ShareTooLargeError) {
        toast.error(
          t('share.tooLarge', { max: formatFileSize(err.maxFileSize) }),
        )
      } else {
        toast.error(err instanceof Error ? err.message : t('share.failed'))
      }
    } finally {
      setSharing(false)
    }
  }

  const handleShare = async () => {
    if (share) {
      setShareOpen(true)
      return
    }
    setSharing(true)
    try {
      const config = await new PocketChestAPI().getConfig()
      setEmailEnabled(config.emailShareEnabled)
      if (config.requirePassword && !sharePassword) {
        setPasswordInvalid(false)
        setPasswordOpen(true)
        return
      }
      await doShare(
        config.requirePassword ? (sharePassword ?? undefined) : undefined,
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('share.failed'))
    } finally {
      setSharing(false)
    }
  }

  const copyLink = async () => {
    if (share && (await copyToClipboard(share.url))) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className={cn(
        'rounded-md',
        'border border-border/60 p-3',
        'transition-shadow duration-200 hover:ring-2 hover:ring-primary',
      )}
    >
      <IKAssetRenderer
        status={result.status}
        renderLoading={() => <IKAssetLoading />}
        renderFailure={() => <IKAssetFailed error={result.error} />}
        renderSuccess={() => (
          <>
            <div className="relative flex items-center justify-center rounded-sm shadow-none shrink-0 aspect-square overflow-hidden group border border-border/60">
              <div className="flex items-center justify-center w-full h-full">
                {isMessage ? (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <FileText className="size-8 text-primary" />
                  </div>
                ) : result.fileInfo ? (
                  <div className="p-3 rounded-lg bg-muted transition-transform duration-500 group-hover:scale-110">
                    {getFileIcon(result.fileInfo.name, 32)}
                  </div>
                ) : null}
              </div>

              <div className="absolute top-2 left-2">
                <div
                  className={cn(
                    'size-6 rounded-md flex items-center justify-center',
                    'backdrop-blur-[2px]',
                  )}
                >
                  {result.mode === ModeEnum.ENCRYPT ? (
                    <Lock className="size-4 text-primary" />
                  ) : (
                    <Unlock className="size-4 text-green-500" />
                  )}
                </div>
              </div>

              <div className="absolute top-2 right-2 z-10 flex gap-1">
                {isMessage && (
                  <Button
                    variant="secondary"
                    size="icon-xs"
                    className="bg-black/40 backdrop-blur-[2px]"
                    onClick={() => setDialogOpen(true)}
                    title={t('card.view')}
                  >
                    <Eye />
                  </Button>
                )}
                {isMessage && result.text && (
                  <CopyButton
                    variant="secondary"
                    size="icon-xs"
                    className="bg-black/40 backdrop-blur-[2px]"
                    value={result.text}
                    title={t('card.copy')}
                  />
                )}
                {isEncrypt && (
                  <Button
                    variant="secondary"
                    size="icon-xs"
                    className="bg-black/40 backdrop-blur-[2px]"
                    onClick={handleShare}
                    disabled={sharing}
                    title={t('card.share')}
                  >
                    {sharing ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Share2 />
                    )}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="icon-xs"
                  className="bg-black/40 backdrop-blur-[2px]"
                  onClick={() => onDownload(result)}
                  title={t('card.download')}
                >
                  <Download />
                </Button>
                <Button
                  variant="secondary"
                  size="icon-xs"
                  className="bg-black/40 backdrop-blur-[2px]"
                  onClick={() => {
                    onRemove(result.id)
                    toast.success(t('toast.resultRemoved'))
                  }}
                  title={t('card.remove')}
                >
                  <X />
                </Button>
              </div>
            </div>

            <div className="space-y-2 mt-3 text-xs text-muted-foreground">
              <p className="flex-1 truncate">
                {isMessage
                  ? t('results.messageResult')
                  : result.fileInfo?.name || t('results.unnamedFile')}
              </p>
              <p>
                {formatFileSize(
                  result.fileInfo?.size ?? result.data.byteLength,
                )}
              </p>
            </div>
          </>
        )}
      />

      {isMessage && (
        <LocalResultDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          result={result}
          onDownload={onDownload}
        />
      )}

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('share.title')}</DialogTitle>
            <DialogDescription>{t('share.desc')}</DialogDescription>
          </DialogHeader>
          {share && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t('share.code')}
                </span>
                <code className="font-mono text-lg font-semibold tracking-widest text-primary">
                  {share.code}
                </code>
              </div>
              <code className="block break-all rounded-lg bg-muted/50 p-2 font-mono text-xs text-muted-foreground">
                {share.url}
              </code>
              <Button className="w-full" variant="outline" onClick={copyLink}>
                {copied ? (
                  <>
                    <CheckCircle className="size-4" />
                    {t('share.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    {t('share.copyLink')}
                  </>
                )}
              </Button>
              {emailEnabled && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setEmailOpen(true)}
                >
                  <Mail className="size-4" />
                  {t('share.emailAction')}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {share && (
        <EmailShare
          retrievalCode={share.code}
          isVisible={emailOpen}
          onClose={() => setEmailOpen(false)}
        />
      )}

      <Dialog
        open={passwordOpen}
        onOpenChange={(open) => {
          if (!open && !sharing) {
            setPasswordOpen(false)
            setPasswordInput('')
            setPasswordInvalid(false)
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('share.passwordTitle')}</DialogTitle>
            <DialogDescription>{t('share.passwordDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {passwordInvalid && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {t('share.passwordInvalid')}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor={`share-password-${result.id}`}>
                {t('share.passwordLabel')}
              </Label>
              <Input
                id={`share-password-${result.id}`}
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && passwordInput && doShare(passwordInput)
                }
                autoFocus
              />
            </div>
            <Button
              className="w-full"
              disabled={sharing || !passwordInput}
              onClick={() => doShare(passwordInput)}
            >
              {sharing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Share2 className="size-4" />
              )}
              {t('share.passwordSubmit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
