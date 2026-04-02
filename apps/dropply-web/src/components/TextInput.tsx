'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@cdlab996/ui/components/accordion'
import { Button } from '@cdlab996/ui/components/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@cdlab996/ui/components/input-group'
import { ClipboardPaste, Copy, FileText, Plus, Trash2 } from 'lucide-react'
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
      filename: `${displayName}.txt`,
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

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setCurrentText((prev) => prev + text)
    } catch {
      // clipboard permission denied
    }
  }

  const handleCopy = async () => {
    if (!currentText) return
    try {
      await navigator.clipboard.writeText(currentText)
    } catch {
      // clipboard permission denied
    }
  }

  const handleClear = () => {
    setCurrentText('')
    setCurrentFilename('')
  }

  return (
    <div className="w-full space-y-6">
      <InputGroup className="h-auto flex-col">
        <InputGroupAddon align="block-start" className="border-b">
          <InputGroupInput
            value={currentFilename}
            onChange={(e) => setCurrentFilename(e.target.value)}
            placeholder={`Label: Text ${textItems.length + 1}`}
          />
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            onClick={handlePaste}
            title="Paste from clipboard"
          >
            <ClipboardPaste />
          </InputGroupButton>
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            onClick={handleCopy}
            disabled={!currentText}
            title="Copy content"
          >
            <Copy />
          </InputGroupButton>
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            onClick={handleClear}
            disabled={!currentText && !currentFilename}
            title="Clear"
          >
            <Trash2 />
          </InputGroupButton>
        </InputGroupAddon>

        <InputGroupTextarea
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter text content, code snippets, notes..."
          rows={3}
        />

        <InputGroupAddon align="block-end" className="border-t">
          <InputGroupText className="text-xs">
            {currentText.length} chars
          </InputGroupText>
          <InputGroupButton
            className="ml-auto"
            size="sm"
            variant="default"
            onClick={addTextItem}
            disabled={!currentText.trim()}
          >
            <Plus className="size-3.5" />
            Add
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      {textItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <h4 className="font-semibold text-foreground">
              Text Items ({textItems.length})
            </h4>
          </div>

          <Accordion
            type="single"
            collapsible
            className="rounded-lg border divide-y"
          >
            {textItems.map((item, index) => {
              const displayName = item.filename?.endsWith('.txt')
                ? item.filename.slice(0, -4)
                : item.filename || `Text ${index + 1}`

              return (
                <AccordionItem
                  // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
                  key={index}
                  value={`item-${index}`}
                  className="px-0 first:pt-0 last:pb-0"
                >
                  <AccordionTrigger className="group flex items-center gap-3 px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">
                        {displayName}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({item.content.length} chars)
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeTextItem(index)
                      }}
                      aria-label={`Delete ${displayName}`}
                      className="shrink-0 text-destructive hover:text-destructive/80"
                    >
                      <Trash2 />
                    </Button>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-4 pt-2 text-xs text-muted-foreground whitespace-pre-wrap wrap-break-word border-t">
                    {item.content}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      )}
    </div>
  )
}
