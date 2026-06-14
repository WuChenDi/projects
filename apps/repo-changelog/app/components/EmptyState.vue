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
  <div class="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
    <div class="grid size-16 place-items-center border border-[var(--rule-strong)] text-[var(--press)]">
      <UIcon
        :name="icon"
        class="size-6"
      />
    </div>
    <p class="rc-kicker mt-6">
      Off the press
    </p>
    <p class="rc-serif mt-1.5 text-xl font-semibold tracking-tight text-[var(--ink)]">
      {{ title }}
    </p>
    <p class="mt-2 max-w-sm text-sm leading-relaxed text-[var(--ink-soft)]">
      {{ description }}
    </p>
  </div>
</template>
