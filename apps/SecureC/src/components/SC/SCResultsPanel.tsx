import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cdlab996/ui/components/empty'
import { Archive, Download, Trash2 } from 'lucide-react'
import type { ProcessResult } from '@/types'
import { StatusEnum } from '@/types'
import { SCResultCard } from './SCResultCard'

interface SCResultsPanelProps {
  results: ProcessResult[]
  onDownload: (result: ProcessResult) => void
  onRemove: (id: string) => void
  onClearAll: () => void
}

export function SCResultsPanel({
  results,
  onDownload,
  onRemove,
  onClearAll,
}: SCResultsPanelProps) {
  return (
    <Card className="flex flex-col p-4 border-none h-full">
      <CardHeader className="p-0 flex flex-row items-center justify-between">
        <CardTitle>Processing Results</CardTitle>
        <CardAction>
          {results.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  results
                    .filter((r) => r.status === StatusEnum.COMPLETED)
                    .forEach((result) => onDownload(result))
                }}
                size="sm"
                variant="secondary"
                disabled={
                  results.filter((r) => r.status === StatusEnum.COMPLETED)
                    .length === 0
                }
              >
                <Download />
                Download All
              </Button>
              <Button onClick={onClearAll} size="sm" variant="secondary">
                <Trash2 />
                Clear All
              </Button>
            </div>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-0 overflow-hidden">
        {results.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 p-0.5">
            {results.map((result) => (
              <SCResultCard
                key={result.id}
                result={result}
                onDownload={onDownload}
                onRemove={onRemove}
              />
            ))}
          </div>
        ) : (
          <Empty className="min-h-65">
            <EmptyMedia variant="icon">
              <Archive className="size-5" />
            </EmptyMedia>

            <EmptyHeader>
              <EmptyTitle>No results yet</EmptyTitle>
              <EmptyDescription>
                Your encrypted or decrypted files and messages will appear here
              </EmptyDescription>
            </EmptyHeader>

            <EmptyContent>
              <p className="text-xs text-muted-foreground/80">
                Select a file or enter text, set a password, and click to start
              </p>
            </EmptyContent>
          </Empty>
        )}
      </CardContent>
    </Card>
  )
}
