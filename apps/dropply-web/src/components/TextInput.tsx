'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Input } from '@cdlab996/ui/components/input'
import { Label } from '@cdlab996/ui/components/label'
import { Textarea } from '@cdlab996/ui/components/textarea'
import { cn } from '@cdlab996/ui/lib/utils'
import { FileText, Hash, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { TextItem } from '@/types'

interface TextInputProps {
  onTextItemsChange: (items: TextItem[]) => void
  textItems: TextItem[]
}

export function TextInput({ onTextItemsChange, textItems }: TextInputProps) {
  const [currentText, setCurrentText] = useState('')
  const [currentFilename, setCurrentFilename] = useState('')

  const addTextItem = () => {
    if (!currentText.trim()) return

    const defaultName = `Text ${textItems.length + 1}`
    const displayName = currentFilename.trim() || defaultName
    const newItem: TextItem = {
      content: currentText,
      filename: `${displayName}.txt`, // Still store as .txt for backend
    }

    onTextItemsChange([...textItems, newItem])
    setCurrentText('')
    setCurrentFilename('')
  }

  const removeTextItem = (index: number) => {
    const newItems = textItems.filter((_, i) => i !== index)
    onTextItemsChange(newItems)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      addTextItem()
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Input Area */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="text-content">Text Content</Label>
          <Textarea
            id="text-content"
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter text content, code snippets, notes... (Ctrl/Cmd + Enter to add)"
            className="h-32 font-mono text-sm resize-none"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="text-label">Label (optional)</Label>
            <Input
              id="text-label"
              type="text"
              value={currentFilename}
              onChange={(e) => setCurrentFilename(e.target.value)}
              placeholder={`Text ${textItems.length + 1}`}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={addTextItem}
              disabled={!currentText.trim()}
              className={cn(
                'px-6 bg-gradient-to-r from-emerald-500 to-teal-500',
                'hover:from-emerald-600 hover:to-teal-600',
                'text-white border-none shadow-md hover:shadow-lg',
                'transition-all duration-200 hover:scale-[1.02]',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
              )}
            >
              <Plus size={16} />
              Add Text
            </Button>
          </div>
        </div>
      </div>

      {/* Text Items List */}
      {textItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-muted-foreground" />
            <h4 className="font-semibold text-foreground">
              Text Items ({textItems.length})
            </h4>
          </div>

          <div className="space-y-3">
            {textItems.map((item, index) => {
              // Remove .txt extension for display
              const displayName = item.filename?.endsWith('.txt')
                ? item.filename.slice(0, -4)
                : item.filename || `Text ${index + 1}`

              return (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
                  key={index}
                  className={cn(
                    'p-4 rounded-lg border border-border/30 bg-background/30 backdrop-blur-sm',
                    'transition-all duration-200 hover:bg-background/50',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                          <FileText
                            size={14}
                            className="text-emerald-600 dark:text-emerald-400"
                          />
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {displayName}
                        </p>
                      </div>

                      <p
                        className={cn(
                          'text-xs text-muted-foreground font-mono leading-relaxed',
                          'bg-muted/30 rounded-md p-2 border border-border/20',
                        )}
                      >
                        {item.content.slice(0, 120)}
                        {item.content.length > 120 ? '...' : ''}
                      </p>

                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Hash size={12} />
                          <span>{item.content.length} characters</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => removeTextItem(index)}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-8 w-8 p-0 text-muted-foreground',
                        'hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
                        'transition-colors duration-200',
                      )}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
