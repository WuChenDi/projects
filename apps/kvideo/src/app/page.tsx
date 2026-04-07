'use client'

import { Button } from '@cdlab996/ui/components/button'
import { IKEmpty, IKPageContainer } from '@cdlab996/ui/IK'
import { Search } from 'lucide-react'
import { Suspense, useMemo, useState } from 'react'
import { FavoritesSidebar } from '@/components/favorites/FavoritesSidebar'
import { WatchHistorySidebar } from '@/components/history/WatchHistorySidebar'
import { PopularFeatures } from '@/components/home/PopularFeatures'
import { SearchResults } from '@/components/home/SearchResults'
import { Header } from '@/components/layout'
import { SearchForm } from '@/components/search/SearchForm'
import { useHomePage } from '@/lib/hooks/useHomePage'
import { useLatencyPing } from '@/lib/hooks/useLatencyPing'

function HomePage() {
  const [contentType, setContentType] = useState<'movie' | 'tv'>('movie')

  const {
    query,
    hasSearched,
    loading,
    results,
    availableSources,
    completedSources,
    totalSources,
    handleSearch,
    handleReset,
  } = useHomePage()

  // Real-time latency pinging
  const sourceUrls = useMemo(
    () => availableSources.map((s) => ({ id: s.id, baseUrl: s.id })), // Using id as baseUrl if not available elsewhere
    [availableSources],
  )

  const { latencies } = useLatencyPing({
    sourceUrls,
    enabled: hasSearched && results.length > 0,
  })

  return (
    <div className="min-h-screen">
      <Header onReset={handleReset} />

      <IKPageContainer>
        <div className="max-w-7xl mx-auto w-full pb-20">
          <div className="mb-8 relative">
            <SearchForm
              onSearch={handleSearch}
              onClear={handleReset}
              isLoading={loading}
              initialQuery={query}
              currentSource=""
              placeholder="搜索电影、电视剧、综艺..."
              checkedSources={completedSources}
              totalSources={totalSources}
              contentType={!hasSearched ? contentType : undefined}
              onContentTypeChange={!hasSearched ? setContentType : undefined}
            />
          </div>

          {/* Results Section */}
          {(results.length >= 1 || (!loading && results.length > 0)) && (
            <SearchResults
              results={results}
              availableSources={availableSources}
              loading={loading}
              latencies={latencies}
            />
          )}

          {/* Popular Features - Homepage */}
          {!loading && !hasSearched && (
            <PopularFeatures
              onSearch={handleSearch}
              contentType={contentType}
            />
          )}

          {!loading && hasSearched && results.length === 0 && (
            <IKEmpty
              title="未找到相关内容"
              description="试试其他关键词或检查拼写"
              icon={Search}
              iconClassName="size-4 text-muted-foreground"
            >
              <Button variant="default" onClick={handleReset} size="lg">
                返回首页
              </Button>
            </IKEmpty>
          )}
        </div>
      </IKPageContainer>

      <FavoritesSidebar />
      <WatchHistorySidebar />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--accent-color)] border-t-transparent"></div>
        </div>
      }
    >
      <HomePage />
    </Suspense>
  )
}
