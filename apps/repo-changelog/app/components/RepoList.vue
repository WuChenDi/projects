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
  <div
    v-if="repos.length > 0"
    class="space-y-3"
  >
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base sm:text-lg font-semibold flex items-center gap-2">
        <UIcon
          :name="icon"
          class="size-4"
        />
        <span class="font-medium text-gray-700 dark:text-gray-200">
          {{ title }}
        </span>
      </h3>

      <UButton
        v-if="showClearAll"
        variant="ghost"
        size="sm"
        icon="i-lucide-trash-2"
        color="error"
        class="text-xs sm:text-sm"
        @click="handleClearAll"
      >
        Clear
      </UButton>
    </div>

    <div class="flex flex-wrap gap-2">
      <div
        v-for="repo in repos"
        :key="repo"
        :class="[
          'group inline-flex items-center gap-1.5 px-2.5 py-1.5',
          'rounded-md border border-gray-200 dark:border-gray-700',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          'transition-colors duration-150',
          clickable && 'cursor-pointer'
        ]"
        :role="clickable ? 'button' : undefined"
        :tabindex="clickable ? 0 : undefined"
        @click="handleRepoClick(repo)"
        @keydown="handleRepoKeydown(repo, $event)"
      >
        <UIcon
          name="i-lucide-github"
          class="size-4 shrink-0"
        />

        <ULink
          :to="getRepoUrl(repo)"
          target="_blank"
          class="text-sm text-gray-600 dark:text-gray-300 hover:text-primary truncate max-w-[200px]"
          @click.stop
        >
          {{ repo }}
        </ULink>

        <UButton
          v-if="showRemoveButton"
          icon="i-lucide-x"
          variant="ghost"
          size="xs"
          square
          :aria-label="`Remove ${repo}`"
          class="shrink-0 p-0"
          @click="(e) => handleRemove(repo, e)"
        />
      </div>
    </div>
  </div>
</template>
