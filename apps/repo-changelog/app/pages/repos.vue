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
  <div class="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 sm:px-6 lg:grid lg:grid-cols-[320px_1fr] lg:grid-rows-[1fr] lg:gap-10">
    <!-- Left rail — full-height column (divider) with an independently scrolling inner pane -->
    <aside class="lg:col-start-1 lg:border-r lg:border-[var(--rule)]">
      <div class="py-4 lg:sticky lg:top-[58px] lg:max-h-[calc(100vh-58px)] lg:overflow-y-auto lg:py-8 lg:pr-10">
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
          <div class="rc-serif truncate text-sm font-semibold tracking-tight">
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
        class="mt-3 space-y-6 lg:!block lg:mt-0"
      >
        <!-- Desktop header -->
        <div class="hidden lg:block">
          <div class="rc-kicker text-[var(--press)]">
            Today's edition
          </div>
          <h1 class="rc-serif mt-2 text-3xl font-semibold leading-tight tracking-tight">
            {{ sidebarTitle }}
          </h1>
          <p class="mt-1.5 text-xs text-[var(--ink-soft)]">
            {{ selectedRepos.length === 1 ? 'Latest releases, set in print' : `A merged dispatch across ${selectedRepos.length} repositories` }}
          </p>
          <div class="rc-rule-double mt-4" />
          <UButton
            variant="link"
            icon="i-lucide-arrow-left"
            size="sm"
            color="neutral"
            class="-ml-1 mt-3 rc-mono text-[11px] uppercase tracking-wider"
            @click="goBackToSelection"
          >
            Back to the newsstand
          </UButton>
        </div>

        <!-- In this edition -->
        <div>
          <div class="rc-kicker mb-2.5 flex items-center justify-between border-b border-[var(--rule)] pb-2">
            <span class="flex items-center gap-2">
              <UIcon
                name="i-lucide-list"
                class="size-3.5 text-[var(--press)]"
              />
              In this edition
            </span>
            <span class="rc-mono text-[10px] text-[var(--ink-faint)]">[{{ selectedRepos.length }}]</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <ULink
              v-for="repo in selectedRepos.slice(0, 12)"
              :key="repo"
              :to="getRepoUrl(repo)"
              target="_blank"
              class="rc-mono border border-[var(--rule)] px-2 py-0.5 text-[11px] text-[var(--ink-soft)] transition-colors hover:border-[var(--press)] hover:text-[var(--press)]"
            >
              {{ repo }}
            </ULink>
            <span
              v-if="selectedRepos.length > 12"
              class="rc-mono px-1 py-0.5 text-[11px] text-[var(--ink-faint)]"
            >
              +{{ selectedRepos.length - 12 }} more
            </span>
          </div>
        </div>

        <!-- Filter -->
        <div>
          <label class="rc-kicker mb-2 block border-b border-[var(--rule)] pb-2">
            Search the columns
          </label>
          <UInput
            v-model="keyword"
            placeholder="Filter release notes..."
            icon="i-lucide-search"
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
            class="rc-mono mt-2 text-[11px] text-[var(--ink-faint)]"
          >
            {{ filteredReleases.length }} / {{ releases?.length ?? 0 }} columns matched
          </p>
        </div>
      </div>
      </div>
    </aside>

    <!-- Broadsheet -->
    <section class="flex flex-1 flex-col py-4 lg:py-8">
      <!-- Loading -->
      <div
        v-if="releasesLoading"
        class="flex flex-col items-center py-24"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="mb-3 size-6 animate-spin text-[var(--press)]"
        />
        <p class="rc-kicker">
          Setting the type…
        </p>
      </div>

      <!-- Error -->
      <div
        v-else-if="releasesError"
        class="flex flex-col items-center py-24 text-center"
      >
        <UIcon
          name="i-lucide-alert-octagon"
          class="mb-3 size-8 text-[var(--press)]"
        />
        <p class="rc-serif mb-1 text-lg font-semibold">
          Stop the presses
        </p>
        <p class="mb-4 text-sm text-[var(--ink-soft)]">
          {{ releasesError.message || 'Failed to fetch releases' }}
        </p>
        <UButton
          variant="outline"
          color="neutral"
          @click="() => refresh()"
        >
          Run it again
        </UButton>
      </div>

      <!-- Empty -->
      <div
        v-else-if="!releases || releases.length === 0"
        class="flex flex-col items-center py-24 text-center"
      >
        <UIcon
          name="i-lucide-package-x"
          class="mb-3 size-10 text-[var(--ink-faint)]"
        />
        <p class="rc-serif mb-1 text-lg font-semibold">
          Nothing to print
        </p>
        <p class="mb-4 text-sm text-[var(--ink-soft)]">
          No releases found for the selected repositories.
        </p>
        <UButton
          variant="outline"
          color="neutral"
          @click="goBackToSelection"
        >
          Pick different titles
        </UButton>
      </div>

      <!-- No filter match -->
      <div
        v-else-if="keyword && filteredReleases.length === 0"
        class="flex flex-col items-center py-20 text-center"
      >
        <UIcon
          name="i-lucide-search-x"
          class="mb-2 size-6 text-[var(--ink-faint)]"
        />
        <p class="text-sm text-[var(--ink-soft)]">
          No columns match “<span class="rc-mono text-[var(--ink)]">{{ keyword }}</span>”
        </p>
      </div>

      <!-- The dispatch -->
      <div
        v-else
        class="mx-auto w-full max-w-2xl"
      >
        <article
          v-for="(release, index) in filteredReleases"
          :key="`${release.repo}-${release.tag}`"
          class="rc-rise"
          :style="{ animationDelay: `${Math.min(index, 8) * 45}ms` }"
        >
          <div
            v-if="index > 0"
            class="rc-rule-double my-8"
          />

          <!-- Byline -->
          <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <ULink
              :to="getRepoUrl(release.repo)"
              target="_blank"
              class="rc-mono text-xs font-medium text-[var(--press)] hover:underline"
              @click.stop
            >
              {{ release.repo }}
            </ULink>
            <span class="text-[var(--rule-strong)]">·</span>
            <span class="rc-mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
              {{ formatTimeAgo(new Date(release.date)) }}
            </span>
            <span class="rc-stamp ml-auto">{{ release.tag }}</span>
          </div>

          <!-- Headline -->
          <ULink
            :to="release.url"
            target="_blank"
            class="group/headline block"
          >
            <h2
              class="rc-serif font-semibold tracking-tight text-[var(--ink)] transition-colors group-hover/headline:text-[var(--press)]"
              :class="index === 0
                ? 'text-3xl leading-[1.05] sm:text-[2.6rem]'
                : 'text-2xl leading-tight sm:text-[1.9rem]'"
            >
              {{ release.title }}
            </h2>
          </ULink>

          <!-- Article body -->
          <div
            class="rc-article relative mt-4"
            :class="{
              'h-auto': isReleaseExpanded(release.repo, release.tag),
              'max-h-[180px] overflow-hidden sm:max-h-[220px]': !isReleaseExpanded(release.repo, release.tag) && release.body.children.length > 4
            }"
          >
            <MDCRenderer
              v-if="release.body"
              :body="release.body"
              :class="index === 0 ? 'rc-dropcap' : ''"
              style="zoom: 0.9"
            />
            <div
              v-if="!isReleaseExpanded(release.repo, release.tag) && release.body.children.length > 4"
              class="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-gradient-to-t from-[var(--paper)] to-transparent"
            >
              <UButton
                size="xs"
                icon="i-lucide-chevron-down"
                color="neutral"
                variant="outline"
                :data-state="isReleaseExpanded(release.repo, release.tag) ? 'open' : 'closed'"
                label="Continued"
                class="group rc-mono text-[11px] uppercase tracking-wider"
                :ui="{ leadingIcon: 'group-data-[state=open]:rotate-180' }"
                @click="toggleRelease(release.repo, release.tag)"
              />
            </div>
          </div>
          <div
            v-if="isReleaseExpanded(release.repo, release.tag) && release.body.children.length > 4"
            class="mt-3"
          >
            <UButton
              size="xs"
              icon="i-lucide-chevron-up"
              color="neutral"
              variant="link"
              label="Fold back"
              class="rc-mono -ml-1 text-[11px] uppercase tracking-wider"
              @click="toggleRelease(release.repo, release.tag)"
            />
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
