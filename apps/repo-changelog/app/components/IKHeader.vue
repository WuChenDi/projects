<script setup lang="ts">
interface Props {
  brand: string
  tagline?: string
  githubHref: string
}

withDefaults(defineProps<Props>(), {
  tagline: ''
})

const { public: { version } } = useRuntimeConfig()

// Filled after mount so the date is computed in the visitor's timezone,
// avoiding an SSR/client hydration mismatch around midnight.
const today = ref('')

onMounted(() => {
  today.value = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})
</script>

<template>
  <header class="sticky top-0 z-30 w-full border-b border-[var(--rule)] bg-[color-mix(in_oklab,var(--paper)_85%,transparent)] backdrop-blur-md">
    <div class="mx-auto flex h-[58px] max-w-[1600px] items-center gap-4 px-4 sm:px-6">
      <!-- Nameplate -->
      <NuxtLink
        to="/"
        class="group flex min-w-0 items-center gap-3"
      >
        <div class="grid size-8 shrink-0 place-items-center border border-[var(--rule-strong)] text-[var(--press)]">
          <UIcon
            name="i-lucide-newspaper"
            class="size-4"
          />
        </div>
        <div class="flex min-w-0 flex-col leading-none">
          <span class="rc-serif truncate text-[17px] font-semibold tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--press)]">
            {{ brand }}
          </span>
          <span
            v-if="tagline"
            class="rc-kicker mt-1 hidden truncate sm:block"
          >
            {{ tagline }}
          </span>
        </div>
      </NuxtLink>

      <!-- Edition line, centred like a broadsheet folio -->
      <div class="hidden flex-1 items-center justify-center gap-3 lg:flex">
        <span class="h-px flex-1 max-w-16 bg-[var(--rule)]" />
        <span class="rc-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
          <template v-if="today">{{ today }} · </template>No. {{ version }}
        </span>
        <span class="h-px flex-1 max-w-16 bg-[var(--rule)]" />
      </div>

      <div class="ml-auto flex items-center gap-1.5 lg:ml-0">
        <slot />
        <UButton
          variant="ghost"
          color="neutral"
          size="md"
          square
          icon="i-simple-icons-github"
          :to="githubHref"
          target="_blank"
          aria-label="GitHub"
        />
      </div>
    </div>
  </header>
</template>
