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
    <div class="flex flex-1 flex-col lg:grid lg:grid-cols-[340px_1fr] lg:grid-rows-[auto_1fr] lg:gap-x-8">
      <!-- Primary rail: Search + Selected -->
      <aside class="py-6 lg:py-8 lg:col-start-1 lg:row-start-1 lg:self-start lg:sticky lg:top-[calc(56px+1rem)]">
        <div class="space-y-6">
          <!-- Search panel -->
          <section class="rc-surface rounded-lg p-4">
            <label class="rc-mono mb-2 block text-[10px] uppercase tracking-widest text-[var(--ui-text-muted)]">
              Search
            </label>
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
              class="mt-2 text-[11px] text-[var(--ui-text-muted)]"
            >
              Try
              <button
                class="rc-mono underline-offset-2 hover:underline"
                @click="searchQuery = 'vuejs/core'; searchRepositories()"
              >
                vuejs/core
              </button>
              or
              <button
                class="rc-mono underline-offset-2 hover:underline"
                @click="searchQuery = 'nuxt'; searchRepositories()"
              >
                nuxt
              </button>
            </p>
          </section>

          <!-- Selected -->
          <section
            v-if="selectedRepos.length > 0"
            class="rc-surface rounded-lg p-4"
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
              View changelog · {{ selectedRepos.length }}
            </UButton>
          </section>

        </div>
      </aside>

      <!-- Right pane -->
      <section class="flex flex-1 flex-col py-6 lg:col-start-2 lg:row-span-2 lg:py-8">
        <!-- Hero header -->
        <header class="mb-6 flex flex-col gap-2">
          <div class="rc-mono flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--ui-text-muted)]">
            <UIcon
              name="i-lucide-sparkles"
              class="size-3"
            />
            Open-source release tracker
          </div>
          <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
            Track GitHub releases like a feed.
          </h1>
          <p class="max-w-xl text-sm text-[var(--ui-text-muted)]">
            Search any owner or repo, select what you want to follow, and read a merged changelog timeline.
          </p>
        </header>

        <!-- Results state -->
        <div v-if="showResults">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-2.5">
              <div class="rc-mono flex items-center gap-2 rounded-md border border-[var(--rc-border)] px-2.5 py-1 text-xs">
                <UIcon
                  name="i-lucide-package-2"
                  class="size-3.5"
                />
                <span>{{ searchResults.length }} results</span>
              </div>
              <span class="text-xs text-[var(--ui-text-muted)]">
                Click to add / remove
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              <div class="flex items-center gap-0.5 rounded-md border border-[var(--rc-border)] p-0.5">
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

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            <button
              v-for="repo in sortedSearchResults"
              :key="repo.id"
              type="button"
              class="group/card relative overflow-hidden rounded-lg border p-3.5 text-left transition-all duration-200"
              :class="selectedRepos.includes(repo.repo)
                ? 'border-[var(--ui-color-primary-500)] bg-[color-mix(in_oklab,var(--ui-color-primary-500)_8%,transparent)]'
                : 'border-[var(--rc-border)] hover:border-[var(--ui-color-primary-500)]/60 hover:bg-[color-mix(in_oklab,var(--ui-color-primary-500)_4%,transparent)]'"
              @click="toggleRepository(repo.repo)"
            >
              <div class="mb-2 flex items-start justify-between gap-2">
                <div class="flex min-w-0 flex-1 items-center gap-2">
                  <UIcon
                    :name="selectedRepos.includes(repo.repo) ? 'i-lucide-check-circle-2' : 'i-lucide-github'"
                    class="size-4 shrink-0"
                    :class="selectedRepos.includes(repo.repo) ? 'text-[var(--ui-color-primary-500)]' : 'text-[var(--ui-text-muted)]'"
                  />
                  <span class="rc-mono truncate text-sm font-medium">
                    {{ repo.repo }}
                  </span>
                </div>
                <UButton
                  icon="i-lucide-external-link"
                  variant="ghost"
                  size="xs"
                  color="neutral"
                  square
                  class="shrink-0 opacity-0 transition-opacity group-hover/card:opacity-100"
                  @click="(e) => openRepoLink(e, repo.repo)"
                />
              </div>
              <p class="mb-3 line-clamp-2 text-xs text-[var(--ui-text-muted)]">
                {{ repo.description }}
              </p>
              <div class="rc-mono flex items-center gap-3 text-[11px] text-[var(--ui-text-muted)]">
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
              </div>
            </button>
          </div>
        </div>

        <!-- Onboarding state -->
        <EmptyState
          v-else
          icon="i-lucide-radar"
          title="Ready when you are"
          description="Use the search on the left to pull in repositories. Selected ones gather into a single timeline."
        />
      </section>

      <!-- Secondary rail: Groups + Recent (below results on mobile, below sticky search on xl) -->
      <aside class="pb-6 lg:col-start-1 lg:row-start-2 lg:self-start lg:pb-8">
        <div class="space-y-6">
          <!-- Groups -->
          <section class="rc-surface rounded-lg p-4">
            <FavoriteGroups
              :selected-repos="selectedRepos"
              @open="openGroup"
            />
          </section>

          <!-- Recent -->
          <section
            v-if="repoHistory.length > 0"
            class="rc-surface rounded-lg p-4"
          >
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
      </aside>
    </div>
  </div>
</template>
