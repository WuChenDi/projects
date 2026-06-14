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
    class="space-y-2.5"
  >
    <div class="flex items-center justify-between border-b border-[var(--rule)] pb-2">
      <div class="rc-kicker flex items-center gap-2">
        <UIcon
          :name="icon"
          class="size-3.5 text-[var(--press)]"
        />
        {{ title }}
        <span class="rc-mono text-[10px] text-[var(--ink-faint)]">[{{ repos.length }}]</span>
      </div>

      <UButton
        v-if="showClearAll"
        variant="link"
        size="xs"
        color="neutral"
        class="-mr-1 rc-mono text-[10px] uppercase tracking-wider"
        @click="handleClearAll"
      >
        Clear
      </UButton>
    </div>

    <ul class="divide-y divide-[var(--rule-soft)]">
      <li
        v-for="repo in repos"
        :key="repo"
        :class="[
          'group/repo flex items-center gap-2.5 py-1.5 transition-colors',
          clickable && 'cursor-pointer hover:text-[var(--press)]'
        ]"
        :role="clickable ? 'button' : undefined"
        :tabindex="clickable ? 0 : undefined"
        @click="handleRepoClick(repo)"
        @keydown="handleRepoKeydown(repo, $event)"
      >
        <span class="text-[var(--press)] opacity-60 transition-opacity group-hover/repo:opacity-100">›</span>
        <ULink
          :to="getRepoUrl(repo)"
          target="_blank"
          class="rc-mono min-w-0 flex-1 truncate text-xs text-[var(--ink)] hover:text-[var(--press)]"
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
