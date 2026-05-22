<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import MDCRenderer from '@nuxtjs/mdc/runtime/components/MDCRenderer.vue'
import { parseMarkdown } from '@nuxtjs/mdc/runtime'

const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const { getRepoUrl } = useRepository()

const selectedRepos = computed(() => {
  if (!route.query.repos) return []

  const repos = Array.isArray(route.query.repos)
    ? route.query.repos
    : [route.query.repos]

  return repos.flatMap(repo =>
    typeof repo === 'string' ? repo.split(',') : []
  ).filter(Boolean)
})

const sidebarTitle = computed(() => {
  const repoCount = selectedRepos.value.length
  if (repoCount === 0) return 'Changelog'
  if (repoCount === 1) return selectedRepos.value[0]!
  return `${repoCount} repositories`
})

const expandedReleases = ref<Set<string>>(new Set())

function toggleRelease(repo: string, tag: string) {
  const key = `${repo}-${tag}`
  if (expandedReleases.value.has(key)) {
    expandedReleases.value.delete(key)
  } else {
    expandedReleases.value.add(key)
  }
  expandedReleases.value = new Set(expandedReleases.value)
}

function isReleaseExpanded(repo: string, tag: string) {
  return expandedReleases.value.has(`${repo}-${tag}`)
}

function validateRepo(repo: string): boolean {
  return /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)
}

async function fetchRepoReleases(repo: string) {
  try {
    const { data: response, error } = await useFetch<{ releases: any[] }>(
      `${config.public.apiUrl}/repos/${repo}/releases`,
      {
        key: `repo-releases-${repo}`,
        getCachedData: key => useNuxtApp().payload.data[key] || useNuxtApp().static.data[key]
      }
    )

    if (error.value || !response.value) {
      console.warn(`Failed to fetch releases for ${repo}:`, error.value)
      return []
    }

    return await Promise.all(
      response.value.releases
        .filter(r => r.draft === false)
        .map(async release => ({
          url: `https://github.com/${repo}/releases/tag/${release.tag}`,
          repo,
          tag: release.tag,
          title: release.name || release.tag,
          date: release.publishedAt,
          rawMarkdown: release.markdown ?? '',
          body: (await parseMarkdown(release.markdown ?? '')).body
        }))
    )
  } catch (error) {
    console.warn(`Failed to fetch releases for ${repo}:`, error)
    return []
  }
}

const { data: releases, pending: releasesLoading, error: releasesError, refresh } = await useAsyncData(
  `releases-${selectedRepos.value.join(',')}`,
  async () => {
    if (selectedRepos.value.length === 0) {
      return []
    }

    const validRepos = selectedRepos.value.filter(repo => validateRepo(repo))

    if (validRepos.length === 0) {
      throw new Error('No valid repositories found')
    }

    const allReleases = await Promise.all(
      validRepos.map(repo => fetchRepoReleases(repo))
    )

    return allReleases
      .flat()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50)
  },
  {
    watch: [() => route.query.repos],
    getCachedData: key => useNuxtApp().payload.data[key] || useNuxtApp().static.data[key]
  }
)

function goBackToSelection() {
  router.push('/')
}

const keyword = ref('')
const mobileMetaExpanded = ref(false)

const filteredReleases = computed(() => {
  if (!releases.value) return []
  const q = keyword.value.trim().toLowerCase()
  if (!q) return releases.value
  return releases.value.filter(r =>
    r.title.toLowerCase().includes(q)
    || r.tag.toLowerCase().includes(q)
    || r.repo.toLowerCase().includes(q)
    || r.rawMarkdown.toLowerCase().includes(q)
  )
})

onMounted(() => {
  if (selectedRepos.value.length === 0) {
    router.push('/')
  }
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 sm:px-6 lg:grid lg:grid-cols-[340px_1fr] lg:gap-8">
    <!-- Left rail -->
    <aside class="lg:sticky lg:top-[calc(56px+1rem)] lg:max-h-[calc(100vh-56px-2rem)] lg:overflow-y-auto py-4 lg:py-8">
      <!-- Mobile header bar -->
      <div class="flex items-center justify-between gap-3 lg:hidden">
        <UButton
          variant="ghost"
          icon="i-lucide-arrow-left"
          size="sm"
          color="neutral"
          @click="goBackToSelection"
        >
          Back
        </UButton>
        <div class="min-w-0 flex-1 text-right">
          <div class="rc-mono truncate text-xs text-[var(--ui-text-muted)]">
            {{ sidebarTitle }}
          </div>
        </div>
        <UButton
          variant="ghost"
          size="sm"
          color="neutral"
          :icon="mobileMetaExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          square
          @click="mobileMetaExpanded = !mobileMetaExpanded"
        />
      </div>

      <div
        v-show="mobileMetaExpanded"
        class="mt-3 space-y-4 lg:!block lg:mt-0"
      >
        <!-- Desktop header -->
        <div class="hidden lg:block">
          <div class="rc-mono mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--ui-text-muted)]">
            <UIcon
              name="i-lucide-git-commit-horizontal"
              class="size-3"
            />
            Changelog
          </div>
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ sidebarTitle }}
          </h1>
          <p class="mt-1 text-xs text-[var(--ui-text-muted)]">
            {{ selectedRepos.length === 1 ? 'Latest releases' : `Merged feed across ${selectedRepos.length} repositories` }}
          </p>
          <UButton
            variant="ghost"
            icon="i-lucide-arrow-left"
            size="sm"
            color="neutral"
            class="-ml-2 mt-3"
            @click="goBackToSelection"
          >
            Back to selection
          </UButton>
        </div>

        <!-- Tracked repos -->
        <div class="rc-surface rounded-lg p-4">
          <div class="rc-mono mb-2.5 flex items-center justify-between text-[10px] uppercase tracking-widest text-[var(--ui-text-muted)]">
            <span class="flex items-center gap-2">
              <UIcon
                name="i-lucide-layers"
                class="size-3"
              />
              Tracking
            </span>
            <span class="opacity-60">
              {{ selectedRepos.length }}
            </span>
          </div>
          <div class="flex flex-wrap gap-1">
            <ULink
              v-for="repo in selectedRepos.slice(0, 12)"
              :key="repo"
              :to="getRepoUrl(repo)"
              target="_blank"
            >
              <UBadge
                variant="outline"
                size="xs"
                color="neutral"
                class="rc-mono hover:border-[var(--ui-color-primary-500)] hover:text-[var(--ui-color-primary-400)]"
              >
                {{ repo }}
              </UBadge>
            </ULink>
            <UBadge
              v-if="selectedRepos.length > 12"
              variant="soft"
              size="xs"
              color="neutral"
            >
              +{{ selectedRepos.length - 12 }} more
            </UBadge>
          </div>
        </div>

        <!-- Filter -->
        <div class="rc-surface rounded-lg p-4">
          <label class="rc-mono mb-2 block text-[10px] uppercase tracking-widest text-[var(--ui-text-muted)]">
            Filter
          </label>
          <UInput
            v-model="keyword"
            placeholder="Search release notes..."
            icon="i-lucide-filter"
            size="sm"
            class="w-full"
          >
            <template
              v-if="keyword?.length"
              #trailing
            >
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-circle-x"
                aria-label="Clear filter"
                @click="keyword = ''"
              />
            </template>
          </UInput>
          <p
            v-if="keyword"
            class="rc-mono mt-2 text-[11px] text-[var(--ui-text-muted)]"
          >
            {{ filteredReleases.length }} / {{ releases?.length ?? 0 }} matched
          </p>
        </div>
      </div>
    </aside>

    <!-- Timeline -->
    <section class="flex flex-1 flex-col py-4 lg:py-8">
      <UChangelogVersions
        as="div"
        :indicator-motion="false"
        :ui="{
          root: 'py-4 sm:py-6',
          indicator: 'inset-y-0'
        }"
      >
        <div
          v-if="releasesLoading"
          class="flex flex-col items-center py-16"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="mb-3 size-6 animate-spin text-[var(--ui-color-primary-500)]"
          />
          <p class="text-xs text-[var(--ui-text-muted)]">
            Loading releases...
          </p>
        </div>

        <div
          v-else-if="releasesError"
          class="flex flex-col items-center py-16"
        >
          <UIcon
            name="i-lucide-alert-circle"
            class="mb-3 size-8 text-red-500"
          />
          <p class="mb-4 text-sm text-red-500">
            {{ releasesError.message || 'Failed to fetch releases' }}
          </p>
          <UButton
            variant="outline"
            color="neutral"
            @click="() => refresh()"
          >
            Retry
          </UButton>
        </div>

        <div
          v-else-if="!releases || releases.length === 0"
          class="flex flex-col items-center py-16"
        >
          <UIcon
            name="i-lucide-package-x"
            class="mb-3 size-10 text-[var(--ui-text-muted)] opacity-60"
          />
          <p class="mb-4 text-sm text-[var(--ui-text-muted)]">
            No releases found for the selected repositories
          </p>
          <UButton
            variant="outline"
            color="neutral"
            @click="goBackToSelection"
          >
            Pick different repositories
          </UButton>
        </div>

        <div
          v-if="keyword && filteredReleases.length === 0 && releases && releases.length > 0"
          class="flex flex-col items-center py-12"
        >
          <UIcon
            name="i-lucide-search-x"
            class="mb-2 size-6 text-[var(--ui-text-muted)] opacity-60"
          />
          <p class="text-xs text-[var(--ui-text-muted)]">
            No releases match "<span class="rc-mono">{{ keyword }}</span>"
          </p>
        </div>

        <UChangelogVersion
          v-for="release in filteredReleases"
          :key="`${release.repo}-${release.tag}`"
          :to="release.url"
          target="_blank"
          :title="release.title"
          :date="formatTimeAgo(new Date(release.date))"
          :ui="{
            root: 'flex items-start',
            container: 'max-w-2xl',
            header: 'border-b border-[var(--rc-border)] pb-3',
            title: 'text-xl sm:text-2xl tracking-tight',
            date: 'rc-mono text-[11px] text-[var(--ui-text-muted)]',
            indicator: 'sticky top-0 pt-8 -mt-8 sm:pt-12 sm:-mt-12'
          }"
        >
          <template #badge>
            <ULink
              :to="getRepoUrl(release.repo)"
              target="_blank"
              @click.stop
            >
              <UBadge
                :label="release.repo"
                variant="outline"
                color="neutral"
                size="xs"
                class="rc-mono hover:border-[var(--ui-color-primary-500)] hover:text-[var(--ui-color-primary-400)]"
              />
            </ULink>
          </template>

          <template #body>
            <div
              class="relative"
              :class="{
                'h-auto min-h-[150px] sm:min-h-[200px]': isReleaseExpanded(release.repo, release.tag),
                'h-[150px] sm:h-[200px] overflow-y-hidden': !isReleaseExpanded(release.repo, release.tag) && release.body.children.length > 4
              }"
            >
              <MDCRenderer
                v-if="release.body"
                :body="release.body"
                style="zoom: 0.85"
              />
              <div
                v-if="!isReleaseExpanded(release.repo, release.tag) && release.body.children.length > 4"
                class="absolute inset-x-0 bottom-0 flex h-14 items-end justify-center bg-gradient-to-t from-[var(--ui-bg)] to-transparent"
              >
                <UButton
                  size="xs"
                  icon="i-lucide-chevron-down"
                  color="neutral"
                  variant="outline"
                  :data-state="isReleaseExpanded(release.repo, release.tag) ? 'open' : 'closed'"
                  :label="isReleaseExpanded(release.repo, release.tag) ? 'Collapse' : 'Expand'"
                  class="group text-xs"
                  :ui="{ leadingIcon: 'group-data-[state=open]:rotate-180' }"
                  @click="toggleRelease(release.repo, release.tag)"
                />
              </div>
            </div>
          </template>
        </UChangelogVersion>
      </UChangelogVersions>
    </section>
  </div>
</template>
