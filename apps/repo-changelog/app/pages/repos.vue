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
  if (repoCount === 1) return `${selectedRepos.value[0]} Changelog`
  return `Changelog (${repoCount} repositories)`
})

const sidebarDescription = computed(() => {
  const repoCount = selectedRepos.value.length
  if (repoCount === 0) return 'Track the latest releases and changelogs'
  if (repoCount === 1) return `Latest releases and updates for ${selectedRepos.value[0]}`
  return `Latest releases and updates for ${repoCount} selected repositories`
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
          body: (await parseMarkdown(release.markdown)).body
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

onMounted(() => {
  if (selectedRepos.value.length === 0) {
    router.push('/')
  }
})
</script>

<template>
  <div class="min-h-[calc(100vh-68px)] xl:grid xl:grid-cols-2">
    <UPageSection
      :title="sidebarTitle"
      :description="sidebarDescription"
      :links="[
        {
          label: 'GitHub',
          icon: 'i-simple-icons-github',
          variant: 'outline',
          size: 'md',
          to: 'https://github.com/WuChenDi/repo-changelog',
          target: '_blank'
        }
        // {
        //   label: 'More',
        //   icon: 'i-lucide-external-link',
        //   variant: 'outline',
        //   size: 'md',
        //   to: 'https://notes-wudi.pages.dev/projects',
        //   target: '_blank'
        // }
      ]"
      :ui="{
        root: 'border-b border-default xl:border-b-0 xl:sticky xl:inset-y-0 xl:h-screen overflow-hidden',
        container: 'max-w-xl h-full items-center justify-center',
        wrapper: 'flex flex-col',
        headline: 'mb-6',
        title: 'text-left text-4xl',
        description: 'text-left max-w-lg',
        links: 'justify-start'
      }"
    >
      <template #top>
        <SkyBg />
        <div
          class="absolute inset-0 z-[-1]"
          :style="{
            backgroundImage: `
                linear-gradient(to right, rgba(99, 102, 241, 0.4) 0%, transparent 1px),
                linear-gradient(to bottom, rgba(181, 184, 208, 0.3) 0%, transparent 1px)
              `,
            backgroundSize: `40px 40px`,
            WebkitMaskImage:
              `radial-gradient(ellipse 100% 100% at 50% 0%, #000 90%, transparent 100%)`,
            maskImage:
              `radial-gradient(ellipse 100% 100% at 50% 0%, #000 90%, transparent 100%)`
          }"
        />
      </template>

      <template #default>
        <div class="mt-6 p-4 bg-muted/30 rounded-lg border border-border/50">
          <div class="mb-6 sm:mb-8">
            <UButton
              variant="ghost"
              icon="i-lucide-arrow-left"
              size="sm"
              class="w-full sm:w-auto justify-center"
              @click="goBackToSelection"
            >
              Back to Repository Selection
            </UButton>
          </div>

          <div v-if="selectedRepos.length > 0">
            <p class="text-sm font-medium text-muted-foreground mb-2">
              Tracking {{ selectedRepos.length }} {{ selectedRepos.length === 1 ? 'repository' : 'repositories' }}:
            </p>
            <div class="flex flex-wrap gap-1">
              <ULink
                v-for="repo in selectedRepos.slice(0, 5)"
                :key="repo"
                :to="getRepoUrl(repo)"
                target="_blank"
                class="inline-block"
              >
                <UBadge
                  variant="outline"
                  size="sm"
                  class="hover:bg-primary/10 hover:border-primary transition-colors duration-200 cursor-pointer"
                >
                  {{ repo }}
                </UBadge>
              </ULink>
              <UBadge
                v-if="selectedRepos.length > 5"
                variant="outline"
                size="xs"
              >
                +{{ selectedRepos.length - 5 }} more
              </UBadge>
            </div>
          </div>
        </div>
      </template>
    </UPageSection>

    <section class="px-4 sm:px-6 xl:px-0 xl:-ms-30 xl:flex-1 bg-background">
      <UColorModeButton class="fixed top-4 right-4 z-10" />

      <UChangelogVersions
        as="main"
        :indicator-motion="false"
        :ui="{
          root: 'py-16 sm:py-24 lg:py-32',
          indicator: 'inset-y-0'
        }"
      >
        <div
          v-if="releasesLoading"
          class="text-center py-8"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="w-8 h-8 animate-spin mx-auto mb-4"
          />
          <p class="text-muted-foreground">
            Loading releases...
          </p>
        </div>

        <div
          v-else-if="releasesError"
          class="text-center py-8"
        >
          <UIcon
            name="i-lucide-alert-circle"
            class="w-8 h-8 mx-auto mb-4 text-red-500"
          />
          <p class="text-red-500 mb-4">
            {{ releasesError.message || 'Failed to fetch releases' }}
          </p>
          <UButton
            variant="outline"
            @click="() => refresh()"
          >
            Retry
          </UButton>
        </div>

        <div
          v-else-if="!releases || releases.length === 0"
          class="text-center py-8"
        >
          <UIcon
            name="i-lucide-package-x"
            class="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50"
          />
          <p class="text-muted-foreground mb-4">
            No releases found for the selected repositories
          </p>
          <UButton
            variant="outline"
            @click="goBackToSelection"
          >
            Select Different Repositories
          </UButton>
        </div>

        <UChangelogVersion
          v-for="release in releases"
          :key="`${release.repo}-${release.tag}`"
          :to="release.url"
          target="_blank"
          :title="release.title"
          :date="formatTimeAgo(new Date(release.date))"
          :ui="{
            root: 'flex items-start',
            container: 'max-w-xl',
            header: 'border-b border-default pb-4',
            title: 'text-3xl',
            date: 'text-xs/9 text-highlighted font-mono',
            indicator: 'sticky top-0 pt-16 -mt-16 sm:pt-24 sm:-mt-24 lg:pt-32 lg:-mt-32'
          }"
        >
          <template #badge>
            <ULink
              :to="getRepoUrl(release.repo)"
              target="_blank"
              @click.stop
            >
              <UBadge
                :label="`@${release.repo}`"
                variant="outline"
                color="neutral"
                class="hover:bg-primary/10 hover:border-primary transition-colors duration-200"
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
                class="h-12 sm:h-16 absolute inset-x-0 bottom-0 flex items-end justify-center"
                :class="{ 'bg-linear-to-t from-default to-default/50': !isReleaseExpanded(release.repo, release.tag) }"
              >
                <UButton
                  size="sm"
                  icon="i-lucide-chevron-down"
                  color="neutral"
                  variant="outline"
                  :data-state="isReleaseExpanded(release.repo, release.tag) ? 'open' : 'closed'"
                  :label="isReleaseExpanded(release.repo, release.tag) ? 'Collapse release' : 'Expand release'"
                  class="group text-xs sm:text-sm"
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
