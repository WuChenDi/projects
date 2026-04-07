'use client'

import { IKPageContainer } from '@cdlab996/ui/IK'
import { Suspense } from 'react'
import { FavoritesSidebar } from '@/components/favorites/FavoritesSidebar'
import { WatchHistorySidebar } from '@/components/history/WatchHistorySidebar'
import { SearchResults } from '@/components/home/SearchResults'
import { Header } from '@/components/layout'
import { PremiumContent } from '@/components/premium/PremiumContent'
import { NoResults } from '@/components/search/NoResults'
import { SearchForm } from '@/components/search/SearchForm'
import { usePremiumHomePage } from '@/lib/hooks/usePremiumHomePage'

function PremiumHomePage() {
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
  } = usePremiumHomePage()

  return (
    <div className="min-h-screen bg-black">
      <Header onReset={handleReset} isPremiumMode={true} />

      <IKPageContainer>
        <div className="max-w-7xl mx-auto w-full pb-20">
          <div className="mb-8 relative">
            <SearchForm
              onSearch={handleSearch}
              onClear={handleReset}
              isLoading={loading}
              initialQuery={query}
              currentSource=""
              checkedSources={completedSources}
              totalSources={totalSources}
              placeholder="输入关键词开始搜索..."
            />
          </div>

          {(results.length >= 1 || (!loading && results.length > 0)) && (
            <SearchResults
              results={results}
              availableSources={availableSources}
              loading={loading}
              isPremium={true}
            />
          )}

          {!loading && hasSearched && results.length === 0 && (
            <NoResults onReset={handleReset} />
          )}

          {!loading && !hasSearched && (
            <PremiumContent onSearch={handleSearch} />
          )}
        </div>
      </IKPageContainer>

      <FavoritesSidebar isPremium={true} />
      <WatchHistorySidebar isPremium={true} />
    </div>
  )
}

export default function PremiumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--accent-color)] border-t-transparent"></div>
        </div>
      }
    >
      <PremiumHomePage />
    </Suspense>
  )
}
