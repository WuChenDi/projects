'use client'

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
} from '@cdlab996/ui/components/combobox'
import {
  InputGroupAddon,
  InputGroupButton,
} from '@cdlab996/ui/components/input-group'
import { Tabs, TabsList, TabsTrigger } from '@cdlab996/ui/components/tabs'
import { HistoryIcon, SearchIcon, XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SearchLoadingAnimation } from '@/components/SearchLoadingAnimation'
import { useSearchHistoryStore } from '@/lib/store/search-history-store'

interface SearchFormProps {
  onSearch: (query: string) => void
  onClear?: () => void
  isLoading: boolean
  initialQuery?: string
  currentSource?: string
  checkedSources?: number
  totalSources?: number
  placeholder?: string
  contentType?: 'movie' | 'tv'
  onContentTypeChange?: (type: 'movie' | 'tv') => void
}

export function SearchForm({
  onSearch,
  onClear,
  isLoading,
  initialQuery = '',
  currentSource = '',
  checkedSources = 0,
  totalSources = 16,
  placeholder = '搜索...',
  contentType,
  onContentTypeChange,
}: SearchFormProps) {
  const [query, setQuery] = useState(initialQuery)

  const {
    getRecentSearches,
    addToSearchHistory,
    removeFromSearchHistory,
    clearSearchHistory,
  } = useSearchHistoryStore()

  const searchHistory = getRecentSearches(10)
  const historyItems = searchHistory.map((item) => item.query)

  // 同步外部传入的 initialQuery
  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  const handleSearch = (q: string = query) => {
    const trimmed = q.trim()
    if (!trimmed) return
    addToSearchHistory(trimmed)
    onSearch(trimmed)
  }

  const handleClear = () => {
    setQuery('')
    onClear?.()
  }

  return (
    <div className="max-w-3xl mx-auto mt-1">
      <div className="flex items-center gap-2">
        {contentType && onContentTypeChange && (
          <Tabs
            value={contentType}
            onValueChange={(v) => onContentTypeChange(v as 'movie' | 'tv')}
          >
            <TabsList>
              <TabsTrigger value="movie">电影</TabsTrigger>
              <TabsTrigger value="tv">电视剧</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="flex-1">
          <Combobox
            items={historyItems}
            value={query}
            onValueChange={(value) => {
              if (value) {
                setQuery(value)
                handleSearch(value)
              }
            }}
          >
            <div
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.defaultPrevented) {
                  handleSearch()
                }
              }}
            >
              <ComboboxInput
                showTrigger={false}
                showClear={false}
                placeholder={placeholder}
                aria-label="搜索视频内容"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              >
                <InputGroupAddon align="inline-end">
                  {query && (
                    <InputGroupButton
                      size="icon-xs"
                      variant="ghost"
                      type="button"
                      onClick={handleClear}
                    >
                      <XIcon />
                    </InputGroupButton>
                  )}
                  <InputGroupButton
                    size="xs"
                    type="button"
                    variant="outline"
                    onClick={() => handleSearch()}
                    disabled={!query.trim()}
                  >
                    <SearchIcon className="size-4" />
                    <span className="hidden sm:inline">搜索</span>
                  </InputGroupButton>
                </InputGroupAddon>
              </ComboboxInput>
            </div>

            {/* 搜索历史下拉菜单 */}
            {searchHistory.length > 0 && (
              <ComboboxContent>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-muted-foreground text-xs">
                    搜索历史
                  </span>
                  <button
                    type="button"
                    onClick={clearSearchHistory}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    清空全部
                  </button>
                </div>
                <ComboboxSeparator className="my-0" />
                <ComboboxList>
                  <ComboboxEmpty>暂无搜索历史</ComboboxEmpty>
                  {historyItems.map((q) => (
                    <ComboboxItem key={q} value={q} className="group/item">
                      <HistoryIcon className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{q}</span>
                      <button
                        type="button"
                        className="shrink-0 size-4 flex items-center justify-center rounded opacity-0 group-hover/item:opacity-50 hover:!opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          removeFromSearchHistory(q)
                        }}
                      >
                        <XIcon className="size-3" />
                      </button>
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            )}
          </Combobox>
        </div>
      </div>

      {/* 搜索加载动画 */}
      {isLoading && (
        <div className="mt-4">
          <SearchLoadingAnimation
            currentSource={currentSource}
            checkedSources={checkedSources}
            totalSources={totalSources}
          />
        </div>
      )}
    </div>
  )
}
