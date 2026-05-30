'use client'

import { Badge } from '@cdlab996/ui/components/badge'
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
import { Progress } from '@cdlab996/ui/components/progress'
import { Spinner } from '@cdlab996/ui/components/spinner'
import { Tabs, TabsList, TabsTrigger } from '@cdlab996/ui/components/tabs'
import { FilmIcon, HistoryIcon, SearchIcon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchSuggestions } from '@/lib/hooks/useSearchSuggestions'
import { useSearchHistory } from '@/lib/store/search-history-store'

function SearchLoadingAnimation({
  checkedSources = 0,
  totalSources = 16,
}: {
  checkedSources?: number
  totalSources?: number
}) {
  const [dots, setDots] = useState('')
  const dotIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const progress = totalSources > 0 ? (checkedSources / totalSources) * 100 : 0
  const isComplete = progress >= 100

  useEffect(() => {
    if (isComplete) {
      if (dotIntervalRef.current) clearInterval(dotIntervalRef.current)
      return
    }

    dotIntervalRef.current = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 600)

    return () => {
      if (dotIntervalRef.current) clearInterval(dotIntervalRef.current)
    }
  }, [isComplete])

  return (
    <div className="mt-4 w-full space-y-2">
      <div className="flex items-center justify-center gap-2">
        <Spinner className="size-4 text-primary" />
        <span className="text-sm text-muted-foreground">
          正在搜索视频源{dots}
        </span>
      </div>

      <Progress value={progress} />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {checkedSources}/{totalSources} 个源
          {isComplete && (
            <Badge variant="default" className="text-[10px] h-4">
              完成
            </Badge>
          )}
        </span>
        <span className="font-medium">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

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
  isPremium?: boolean
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
  isPremium = false,
}: SearchFormProps) {
  const [query, setQuery] = useState(initialQuery)

  const {
    getRecentSearches,
    addToSearchHistory,
    removeFromSearchHistory,
    clearSearchHistory,
  } = useSearchHistory(isPremium)

  const { suggestions, fetchSuggestions, clearSuggestions } =
    useSearchSuggestions()

  const searchHistory = getRecentSearches(10)
  const historyItems = searchHistory.map((item) => item.query)

  // Merge: if we have suggestions use suggestion titles, otherwise use history
  const hasSuggestions = query.trim().length > 0 && suggestions.length > 0
  const comboboxItems = hasSuggestions
    ? suggestions.map((s) => s.title)
    : historyItems

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
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
        {contentType && onContentTypeChange && (
          <Tabs
            value={contentType}
            onValueChange={(v) => onContentTypeChange(v as 'movie' | 'tv')}
          >
            <TabsList className="shrink-0">
              <TabsTrigger value="movie">电影</TabsTrigger>
              <TabsTrigger value="tv">电视剧</TabsTrigger>
              {/* <TabsTrigger value="show">综艺</TabsTrigger> */}
            </TabsList>
          </Tabs>
        )}

        <div className="w-full min-w-0 sm:flex-1">
          <Combobox
            items={comboboxItems}
            value={query}
            onValueChange={(value) => {
              if (value) {
                setQuery(value)
                clearSuggestions()
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
                onChange={(e) => {
                  setQuery(e.target.value)
                  fetchSuggestions(e.target.value)
                }}
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

            {(searchHistory.length > 0 || hasSuggestions) && (
              <ComboboxContent>
                {hasSuggestions ? (
                  <>
                    <div className="px-2 py-1.5">
                      <span className="text-muted-foreground text-xs">
                        豆瓣建议
                      </span>
                    </div>
                    <ComboboxSeparator className="my-0" />
                    <ComboboxList>
                      <ComboboxEmpty>无匹配结果</ComboboxEmpty>
                      {suggestions.map((s) => (
                        <ComboboxItem
                          key={s.id}
                          value={s.title}
                          className="group/item"
                        >
                          {s.img ? (
                            <img
                              src={s.img}
                              alt=""
                              className="size-8 rounded object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <FilmIcon className="size-4 text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-sm">{s.title}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {[s.year, s.sub_title, s.episode]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </div>
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </>
                ) : searchHistory.length > 0 ? (
                  <>
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
                  </>
                ) : null}
              </ComboboxContent>
            )}
          </Combobox>
        </div>
      </div>

      {isLoading && (
        <SearchLoadingAnimation
          checkedSources={checkedSources}
          totalSources={totalSources}
        />
      )}
    </div>
  )
}
