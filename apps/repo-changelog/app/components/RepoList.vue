<script setup lang="ts">
interface Props {
  title: string
  repos: string[]
  icon?: string
  badgeCount?: number
  showClearAll?: boolean
  showRemoveButton?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'i-lucide-clock',
  showClearAll: true,
  showRemoveButton: true,
  clickable: true
})

const emit = defineEmits<{
  remove: [repo: string]
  clearAll: []
  click: [repo: string]
}>()

const { getRepoUrl } = useRepository()

function handleRepoClick(repo: string) {
  if (props.clickable) {
    emit('click', repo)
  }
}

function handleRepoKeydown(repo: string, event: KeyboardEvent) {
  if (props.clickable && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault()
    emit('click', repo)
  }
}

function handleRemove(repo: string, event: Event) {
  event.stopPropagation()
  emit('remove', repo)
}

function handleClearAll() {
  emit('clearAll')
}
</script>

<template>
  <section
    v-if="repos.length > 0"
    class="space-y-2"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--ui-text-muted)]">
        <UIcon
          :name="icon"
          class="size-3.5"
        />
        {{ title }}
        <span class="rc-mono text-[10px] opacity-60">{{ repos.length }}</span>
      </div>

      <UButton
        v-if="showClearAll"
        variant="ghost"
        size="xs"
        color="neutral"
        class="-mr-1 text-[11px]"
        @click="handleClearAll"
      >
        Clear
      </UButton>
    </div>

    <ul class="space-y-0.5">
      <li
        v-for="repo in repos"
        :key="repo"
        :class="[
          'group/repo flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 transition',
          'hover:border-[var(--rc-border)] hover:bg-[var(--ui-bg-muted)]',
          clickable && 'cursor-pointer'
        ]"
        :role="clickable ? 'button' : undefined"
        :tabindex="clickable ? 0 : undefined"
        @click="handleRepoClick(repo)"
        @keydown="handleRepoKeydown(repo, $event)"
      >
        <UIcon
          name="i-lucide-github"
          class="size-3.5 shrink-0 text-[var(--ui-text-muted)]"
        />
        <ULink
          :to="getRepoUrl(repo)"
          target="_blank"
          class="rc-mono min-w-0 flex-1 truncate text-xs text-[var(--ui-text)] hover:text-[var(--ui-color-primary-400)]"
          @click.stop
        >
          {{ repo }}
        </ULink>
        <UButton
          v-if="showRemoveButton"
          icon="i-lucide-x"
          variant="ghost"
          size="xs"
          color="neutral"
          square
          :aria-label="`Remove ${repo}`"
          class="shrink-0 opacity-0 transition-opacity group-hover/repo:opacity-100"
          @click="(e) => handleRemove(repo, e)"
        />
      </li>
    </ul>
  </section>
</template>
