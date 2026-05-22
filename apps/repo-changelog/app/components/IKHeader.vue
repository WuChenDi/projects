<script setup lang="ts">
interface Props {
  brand: string
  githubHref: string
}

defineProps<Props>()

const { public: { version } } = useRuntimeConfig()
</script>

<template>
  <header class="sticky top-0 z-30 w-full bg-transparent">
    <div class="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
      <NuxtLink
        to="/"
        class="group flex items-center gap-2.5"
      >
        <div class="relative grid size-7 place-items-center rounded-md border border-[var(--rc-border)]">
          <UIcon
            name="i-lucide-git-pull-request-arrow"
            class="size-4 text-[var(--ui-color-primary-500)]"
          />
        </div>
        <div class="flex items-baseline gap-1.5">
          <span class="text-sm font-semibold tracking-tight">{{ brand }}</span>
          <span class="rc-mono hidden text-[10px] uppercase tracking-widest text-[var(--ui-text-muted)] sm:inline">
            v{{ version }}
          </span>
        </div>
      </NuxtLink>

      <div class="flex items-center gap-1.5">
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
