'use client'

import { Button } from '@cdlab996/ui/components/button'
import { IKEmpty, IKPageContainer } from '@cdlab996/ui/IK'
import { Search } from 'lucide-react'
import { Suspense, useEffect, useMemo } from 'react'
import { SearchResults } from '@/components/home/SearchResults'
import { PremiumContent } from '@/components/premium/PremiumContent'
import { SearchForm } from '@/components/search/SearchForm'
import { useHomePage } from '@/lib/hooks/useHomePage'
import { useLatencyPing } from '@/lib/hooks/useLatencyPing'
import { useHeaderResetStore } from '@/lib/store/header-reset-store'

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
  } = useHomePage({ isPremium: true })

  const sourceUrls = useMemo(
    () => availableSources.map((s) => ({ id: s.id, baseUrl: s.id })),
    [availableSources],
  )

  const { latencies } = useLatencyPing({
    sourceUrls,
    enabled: hasSearched && results.length > 0,
  })

  useEffect(() => {
    const { setOnReset } = useHeaderResetStore.getState()
    setOnReset(handleReset)
    return () => setOnReset(null)
  }, [handleReset])

  return (
    <IKPageContainer>
      <div className="max-w-7xl mx-auto w-full">
        <div className="my-8 relative">
          <SearchForm
            onSearch={handleSearch}
            onClear={handleReset}
            isLoading={loading}
            initialQuery={query}
            currentSource=""
            checkedSources={completedSources}
            totalSources={totalSources}
            placeholder="输入关键词开始搜索..."
            isPremium
          />
        </div>

        {(results.length >= 1 || (!loading && results.length > 0)) && (
          <SearchResults
            results={results}
            availableSources={availableSources}
            loading={loading}
            isPremium={true}
            latencies={latencies}
          />
        )}

        {!loading && !hasSearched && <PremiumContent />}

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
  )
}

export default function PremiumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
        </div>
      }
    >
      <PremiumHomePage />
    </Suspense>
  )
}
