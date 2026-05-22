<script setup lang="ts">
interface Props {
  icon?: string
  title?: string
  description?: string
}

withDefaults(defineProps<Props>(), {
  icon: 'i-lucide-package-search',
  title: 'Nothing here yet',
  description: 'Search a repo, user or organization on the left to get started.'
})
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
    <div class="grid size-14 place-items-center rounded-xl border border-[var(--rc-border)]">
      <UIcon
        :name="icon"
        class="size-6 text-[var(--ui-text-muted)]"
      />
    </div>
    <p class="mt-4 text-sm font-medium text-[var(--ui-text)]">
      {{ title }}
    </p>
    <p class="mt-1 max-w-sm text-xs text-[var(--ui-text-muted)]">
      {{ description }}
    </p>
  </div>
</template>
