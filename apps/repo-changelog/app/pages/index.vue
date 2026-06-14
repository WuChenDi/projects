<script setup lang="ts">
import { formatTimeAgo, useStorage } from '@vueuse/core'
import type { GithubRepo, RepoApiResponse, ReposApiResponse, SearchResult } from '~~/shared/types/releases'

const config = useRuntimeConfig()
const router = useRouter()
const { getRepoUrl } = useRepository()

const selectedRepos = ref<string[]>([])
const searchQuery = ref<string>('')
const searchError = ref<string>('')
const isLoading = ref<boolean>(false)
const searchResults = ref<SearchResult[]>([])
const showResults = ref<boolean>(false)
const sortBy = ref<'stars' | 'forks' | 'name' | 'updated'>('stars')
const sortOrder = ref<'asc' | 'desc'>('desc')

const MAX_HISTORY = 10

const repoHistory = useStorage<string[]>('repo-history', [], undefined, {
  serializer: {
    read: (v: string) => {
      try {
        return JSON.parse(v)
      } catch (e) {
        console.error('Failed to parse repo history:', e)
        return []
      }
    },
    write: (v: string[]) => JSON.stringify(v)
  }
})

function saveToHistory(repos: string[]) {
  const uniqueRepos = [...new Set(repos)]
  const filteredHistory = repoHistory.value.filter(r => !uniqueRepos.includes(r))

  const newHistory = [
    ...uniqueRepos,
    ...filteredHistory
  ].slice(0, MAX_HISTORY)

  repoHistory.value = newHistory
}

async function navigateToRepo(repo: string) {
  await router.push({
    path: '/repos',
    query: { repos: repo }
  })
}

async function openGroup(repos: string[]) {
  if (repos.length === 0) return
  saveToHistory(repos)
  await navigateToRepo(repos.join(','))
}

function removeFromHistory(repo: string) {
  repoHistory.value = repoHistory.value.filter(r => r !== repo)
}

function convertToSearchResult(repo: GithubRepo): SearchResult {
  return {
    id: repo.id,
    name: repo.name,
    repo: repo.repo,
    description: repo.description || 'No description available',
    stars: repo.stars,
    forks: repo.forks,
    updatedAt: repo.updatedAt
  }
}

const sortOptions = [
  { value: 'stars', label: 'Stars', icon: 'i-lucide-star' },
  { value: 'forks', label: 'Forks', icon: 'i-lucide-git-fork' },
  { value: 'updated', label: 'Updated', icon: 'i-lucide-calendar' }
]

const sortedSearchResults = computed(() => {
  if (!searchResults.value.length) return []

  const results = [...searchResults.value]

  return results.sort((a, b) => {
    let comparison = 0

    switch (sortBy.value) {
      case 'stars':
        comparison = a.stars - b.stars
        break
      case 'forks':
        comparison = a.forks - b.forks
        break
      case 'name':
        comparison = a.repo.toLowerCase().localeCompare(b.repo.toLowerCase())
        break
      case 'updated':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
    }

    return sortOrder.value === 'desc' ? -comparison : comparison
  })
})

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}

function validateRepoFormat(repo: string): boolean {
  return /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)
}

function validateOwnerFormat(owner: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(owner)
}

async function searchRepositories() {
  searchError.value = ''
  searchResults.value = []
  showResults.value = false

  if (!searchQuery.value.trim()) {
    searchError.value = 'Enter a repo, user, organization, or GitHub URL'
    return
  }

  const input = searchQuery.value.trim()

  const githubUrlMatch = input.match(/github\.com\/([a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)?)/i)
  if (githubUrlMatch && githubUrlMatch[1]) {
    const extracted = githubUrlMatch[1]

    if (extracted.includes('/')) {
      isLoading.value = true

      try {
        const { data: response, error } = await useFetch<RepoApiResponse>(
          `${config.public.apiUrl}/repos/${extracted}`,
          {
            key: `repo-validate-${extracted}`,
            getCachedData: key => useNuxtApp().payload.data[key] || useNuxtApp().static.data[key]
          }
        )

        if (error.value || response.value?.error || !response.value?.repo) {
          searchError.value = 'Repository not found. Check the URL and try again.'
          return
        }

        saveToHistory([extracted])
        await navigateToRepo(extracted)
        return
      } catch (error) {
        console.error('Repository validation error:', error)
        searchError.value = 'Failed to verify repository. Please try again.'
        return
      } finally {
        isLoading.value = false
      }
    } else {
      searchQuery.value = extracted
    }
  }

  const processedInput = searchQuery.value.trim()
  isLoading.value = true

  try {
    if (processedInput.includes('/')) {
      if (!validateRepoFormat(processedInput)) {
        searchError.value = 'Invalid format. Use: owner/repository'
        return
      }
      await searchSingleRepository(processedInput)
    } else {
      if (!validateOwnerFormat(processedInput)) {
        searchError.value = 'Enter a valid username or organization name'
        return
      }
      await searchOwnerRepositories(processedInput)
    }
  } catch (error) {
    console.error('Search error:', error)
    searchError.value = 'Search failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}

async function searchSingleRepository(repoName: string) {
  try {
    const { data: response, error } = await useFetch<RepoApiResponse>(
      `${config.public.apiUrl}/repos/${repoName}`,
      {
        key: `repo-${repoName}`,
        getCachedData: key => useNuxtApp().payload.data[key] || useNuxtApp().static.data[key]
      }
    )

    if (error.value || response.value?.error) {
      searchError.value = 'Repository not found or inaccessible'
      return
    }

    if (response.value?.repo) {
      searchResults.value = [convertToSearchResult(response.value.repo)]
      showResults.value = true
    } else {
      searchError.value = 'Repository not found'
    }
  } catch (error) {
    console.error('Single repository search error:', error)
    searchError.value = 'Repository not found or inaccessible'
  }
}

async function searchOwnerRepositories(owner: string) {
  try {
    let response: ReposApiResponse | null = null
    let fetchError = null

    const { data: orgData, error: orgError } = await useFetch<ReposApiResponse>(
      `${config.public.apiUrl}/orgs/${owner}/repos`,
      {
        key: `org-repos-${owner}`,
        getCachedData: key => useNuxtApp().payload.data[key] || useNuxtApp().static.data[key]
      }
    )

    if (!orgError.value && orgData.value && !orgData.value.error) {
      response = orgData.value
    } else {
      const { data: userData, error: userError } = await useFetch<ReposApiResponse>(
        `${config.public.apiUrl}/users/${owner}/repos`,
        {
          key: `user-repos-${owner}`,
          getCachedData: key => useNuxtApp().payload.data[key] || useNuxtApp().static.data[key]
        }
      )

      if (!userError.value && userData.value) {
        response = userData.value
      } else {
        fetchError = userError.value
      }
    }

    if (fetchError || response?.error) {
      searchError.value = 'User or organization not found'
      return
    }

    if (response?.repos && Array.isArray(response.repos) && response.repos.length > 0) {
      searchResults.value = response.repos.map(convertToSearchResult)
      showResults.value = true
    } else {
      searchError.value = 'No repositories found'
    }
  } catch (error) {
    console.error('Owner repositories search error:', error)
    searchError.value = 'User or organization not found'
  }
}

function toggleRepository(repoName: string) {
  if (selectedRepos.value.includes(repoName)) {
    removeRepository(repoName)
  } else {
    addSelectedRepository(repoName)
  }
}

function addSelectedRepository(repoName: string) {
  if (!selectedRepos.value.includes(repoName)) {
    selectedRepos.value.push(repoName)
  }
}

function removeRepository(repo: string) {
  const index = selectedRepos.value.indexOf(repo)
  if (index !== -1) {
    selectedRepos.value.splice(index, 1)
  }
}

async function viewReleases() {
  if (selectedRepos.value.length === 0) {
    return
  }

  isLoading.value = true

  try {
    saveToHistory(selectedRepos.value)
    await navigateToRepo(selectedRepos.value.join(','))
  } finally {
    isLoading.value = false
  }
}

function openRepoLink(event: Event, repoName: string) {
  event.stopPropagation()
  window.open(getRepoUrl(repoName), '_blank')
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 sm:px-6">
    <div class="flex flex-1 flex-col lg:grid lg:grid-cols-[340px_1fr] lg:grid-rows-[1fr] lg:gap-x-10">
      <!-- Left rail — full-height column (divider) with an independently scrolling inner pane -->
      <aside class="lg:col-start-1 lg:border-r lg:border-[var(--rule)]">
        <div class="py-6 lg:sticky lg:top-[58px] lg:max-h-[calc(100vh-58px)] lg:overflow-y-auto lg:py-8 lg:pr-10">
          <div class="space-y-7">
          <!-- Search panel -->
          <section>
            <div class="mb-2.5 flex items-center gap-2 border-b border-[var(--rule)] pb-2">
              <span class="rc-kicker text-[var(--press)]">The wire desk</span>
            </div>
            <div class="flex items-center gap-2">
              <UInput
                v-model="searchQuery"
                :loading="isLoading"
                placeholder="owner/repo, user, or URL"
                class="flex-1"
                icon="i-lucide-search"
                :color="searchError ? 'error' : 'primary'"
                :disabled="isLoading"
                @keyup.enter="searchRepositories"
              >
                <template
                  v-if="searchQuery?.length"
                  #trailing
                >
                  <UButton
                    color="neutral"
                    variant="link"
                    size="sm"
                    icon="i-lucide-circle-x"
                    aria-label="Clear input"
                    @click="searchQuery = ''"
                  />
                </template>
              </UInput>
              <UButton
                icon="i-lucide-arrow-right"
                :loading="isLoading"
                :disabled="!searchQuery.trim()"
                size="md"
                color="primary"
                square
                aria-label="Search"
                @click="searchRepositories"
              />
            </div>
            <p
              v-if="searchError"
              class="mt-2 flex items-start gap-1.5 text-xs text-red-500"
            >
              <UIcon
                name="i-lucide-alert-circle"
                class="mt-0.5 size-3.5 shrink-0"
              />
              <span>{{ searchError }}</span>
            </p>
            <p
              v-else
              class="mt-2 text-[11px] text-[var(--ink-soft)]"
            >
              Try
              <button
                class="rc-mono text-[var(--press)] underline-offset-2 hover:underline"
                @click="searchQuery = 'vuejs/core'; searchRepositories()"
              >
                vuejs/core
              </button>
              or
              <button
                class="rc-mono text-[var(--press)] underline-offset-2 hover:underline"
                @click="searchQuery = 'nuxt'; searchRepositories()"
              >
                nuxt
              </button>
            </p>
          </section>

          <!-- Selected -->
          <section
            v-if="selectedRepos.length > 0"
          >
            <RepoList
              title="Selected"
              :repos="selectedRepos"
              :badge-count="selectedRepos.length"
              icon="i-lucide-check-circle-2"
              :clickable="false"
              @remove="removeRepository"
              @clear-all="() => selectedRepos = []"
            />
            <UButton
              :loading="isLoading && selectedRepos.length > 0"
              :disabled="isLoading"
              size="md"
              icon="i-lucide-arrow-right"
              trailing
              color="primary"
              block
              class="mt-3"
              @click="viewReleases"
            >
              Print the changelog · {{ selectedRepos.length }}
            </UButton>
          </section>

          <!-- Groups -->
          <section>
            <FavoriteGroups
              :selected-repos="selectedRepos"
              @open="openGroup"
            />
          </section>

          <!-- Recent -->
          <section v-if="repoHistory.length > 0">
            <RepoList
              title="Recent"
              :repos="repoHistory"
              icon="i-lucide-history"
              :clickable="true"
              @click="navigateToRepo"
              @remove="removeFromHistory"
              @clear-all="() => repoHistory = []"
            />
          </section>
          </div>
        </div>
      </aside>

      <!-- Right pane -->
      <section class="flex flex-1 flex-col py-6 lg:col-start-2 lg:py-8">
        <!-- Masthead hero -->
        <header class="mb-8">
          <div class="flex items-center gap-3">
            <span class="rc-kicker text-[var(--press)]">Vol. II</span>
            <span class="h-px flex-1 bg-[var(--rule)]" />
            <span class="rc-kicker">Open-source release tracker</span>
          </div>
          <h1 class="rc-serif mt-4 text-balance text-[2.5rem] font-semibold leading-[0.98] tracking-tight sm:text-6xl">
            Read every release<br>
            <span class="italic text-[var(--press)]">like the morning paper.</span>
          </h1>
          <div class="rc-rule-double mt-5" />
          <p class="rc-dropcap mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-soft)]">
            Subscribe to any GitHub owner or repository, pick the projects worth following, and we set them in one continuous, type-set changelog — every tag, every release note, printed in chronological order.
          </p>
        </header>

        <!-- Results state -->
        <div v-if="showResults">
          <div class="mb-5 flex flex-col gap-3 border-b border-[var(--rule)] pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div class="flex items-baseline gap-2.5">
              <span class="rc-serif text-2xl font-semibold tracking-tight">Classifieds</span>
              <span class="rc-mono text-xs text-[var(--ink-faint)]">
                {{ searchResults.length }} listings · tap to clip
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              <div class="flex items-center gap-0.5 rounded-md border border-[var(--rule)] p-0.5">
                <UButton
                  v-for="option in sortOptions"
                  :key="option.value"
                  :icon="option.icon"
                  size="xs"
                  :variant="sortBy === option.value ? 'solid' : 'ghost'"
                  :color="sortBy === option.value ? 'primary' : 'neutral'"
                  class="text-[11px]"
                  @click="sortBy = option.value as 'stars' | 'forks' | 'name' | 'updated'"
                >
                  <span class="hidden sm:inline">{{ option.label }}</span>
                </UButton>
              </div>
              <UButton
                :icon="sortOrder === 'desc' ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up'"
                size="xs"
                variant="outline"
                color="neutral"
                square
                :title="`Sort ${sortOrder === 'desc' ? 'descending' : 'ascending'}`"
                @click="toggleSortOrder"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-px overflow-hidden border border-[var(--rule)] bg-[var(--rule-soft)] sm:grid-cols-2 2xl:grid-cols-3">
            <button
              v-for="repo in sortedSearchResults"
              :key="repo.id"
              type="button"
              class="group/card relative flex flex-col p-4 text-left transition-colors duration-150"
              :class="selectedRepos.includes(repo.repo)
                ? 'bg-[color-mix(in_oklab,var(--press)_9%,var(--paper-card))]'
                : 'bg-[var(--paper-card)] hover:bg-[color-mix(in_oklab,var(--press)_4%,var(--paper-card))]'"
              @click="toggleRepository(repo.repo)"
            >
              <!-- Clipped corner mark when selected -->
              <span
                v-if="selectedRepos.includes(repo.repo)"
                class="rc-stamp absolute right-3 top-3 rotate-3"
              >
                Clipped
              </span>

              <div class="mb-2 flex items-start gap-2 pr-16">
                <span class="rc-mono shrink-0 text-[var(--press)]">{{ selectedRepos.includes(repo.repo) ? '■' : '□' }}</span>
                <span class="rc-mono truncate text-sm font-medium text-[var(--ink)]">
                  {{ repo.repo }}
                </span>
              </div>
              <p class="mb-4 line-clamp-2 flex-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">
                {{ repo.description }}
              </p>
              <div class="rc-mono flex items-center gap-3 border-t border-[var(--rule-soft)] pt-2.5 text-[11px] text-[var(--ink-faint)]">
                <span class="flex items-center gap-1">
                  <UIcon
                    name="i-lucide-star"
                    class="size-3"
                  />
                  {{ formatCount(repo.stars) }}
                </span>
                <span class="flex items-center gap-1">
                  <UIcon
                    name="i-lucide-git-fork"
                    class="size-3"
                  />
                  {{ formatCount(repo.forks) }}
                </span>
                <span class="hidden items-center gap-1 sm:flex">
                  <UIcon
                    name="i-lucide-calendar"
                    class="size-3"
                  />
                  {{ formatTimeAgo(new Date(repo.updatedAt)) }}
                </span>
                <UButton
                  icon="i-lucide-external-link"
                  variant="ghost"
                  size="xs"
                  color="neutral"
                  square
                  class="ml-auto -my-1 shrink-0 opacity-0 transition-opacity group-hover/card:opacity-100"
                  @click="(e) => openRepoLink(e, repo.repo)"
                />
              </div>
            </button>
          </div>
        </div>

        <!-- Onboarding state -->
        <EmptyState
          v-else
          icon="i-lucide-newspaper"
          title="The presses are warm"
          description="Look up an owner or repository at the wire desk. Clip the projects you care about and we'll set them into one continuous changelog."
        />
      </section>
    </div>
  </div>
</template>
