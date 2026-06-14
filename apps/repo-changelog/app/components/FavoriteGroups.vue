<script setup lang="ts">
interface Props {
  selectedRepos: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  open: [repos: string[]]
}>()

const { groups, addGroup, removeGroup } = useFavoriteGroups()

const isCreateOpen = ref(false)
const newGroupName = ref('')
const createError = ref('')

function openCreate() {
  newGroupName.value = ''
  createError.value = ''
  isCreateOpen.value = true
}

function confirmCreate() {
  if (!newGroupName.value.trim()) {
    createError.value = 'Group name is required'
    return
  }
  if (props.selectedRepos.length === 0) {
    createError.value = 'Select repositories first'
    return
  }
  addGroup(newGroupName.value, props.selectedRepos)
  isCreateOpen.value = false
}

function openGroup(repos: string[]) {
  emit('open', repos)
}

function handleGroupKeydown(repos: string[], event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openGroup(repos)
  }
}
</script>

<template>
  <section class="space-y-2.5">
    <div class="flex items-center justify-between border-b border-[var(--rule)] pb-2">
      <div class="rc-kicker flex items-center gap-2">
        <UIcon
          name="i-lucide-bookmark"
          class="size-3.5 text-[var(--press)]"
        />
        Saved editions
        <span
          v-if="groups.length > 0"
          class="rc-mono text-[10px] text-[var(--ink-faint)]"
        >
          [{{ groups.length }}]
        </span>
      </div>

      <UButton
        v-if="selectedRepos.length > 0"
        variant="link"
        size="xs"
        icon="i-lucide-plus"
        color="primary"
        class="-mr-1 rc-mono text-[10px] uppercase tracking-wider"
        @click="openCreate"
      >
        Save
      </UButton>
    </div>

    <p
      v-if="groups.length === 0"
      class="text-xs leading-relaxed text-[var(--ink-soft)]"
    >
      Bundle the repos you follow into a named edition for one-click reading.
    </p>

    <ul
      v-else
      class="divide-y divide-[var(--rule-soft)]"
    >
      <li
        v-for="group in groups"
        :key="group.id"
        role="button"
        tabindex="0"
        :aria-label="`Open group ${group.name}`"
        class="group/item flex cursor-pointer items-center justify-between gap-2 py-2 transition-colors hover:text-[var(--press)] focus-visible:outline-none"
        @click="openGroup(group.repos)"
        @keydown="handleGroupKeydown(group.repos, $event)"
      >
        <div class="min-w-0 flex-1">
          <div class="rc-serif truncate text-[15px] font-semibold tracking-tight text-[var(--ink)] group-hover/item:text-[var(--press)]">
            {{ group.name }}
          </div>
          <div class="rc-mono mt-0.5 truncate text-[10px] text-[var(--ink-faint)]">
            {{ group.repos.length }} {{ group.repos.length === 1 ? 'title' : 'titles' }} · {{ group.repos.slice(0, 2).join(', ') }}{{ group.repos.length > 2 ? '…' : '' }}
          </div>
        </div>
        <UButton
          icon="i-lucide-x"
          variant="ghost"
          size="xs"
          color="neutral"
          square
          class="opacity-0 transition-opacity group-hover/item:opacity-100"
          :aria-label="`Delete group ${group.name}`"
          @click.stop="removeGroup(group.id)"
        />
      </li>
    </ul>

    <UModal
      v-model:open="isCreateOpen"
      title="Save as group"
      :description="`Save ${selectedRepos.length} repositor${selectedRepos.length === 1 ? 'y' : 'ies'} as a named group.`"
    >
      <template #body>
        <div class="space-y-3">
          <UInput
            v-model="newGroupName"
            placeholder="Group name (e.g. Frontend tools)"
            autofocus
            class="w-full"
            @keyup.enter="confirmCreate"
          />
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="repo in selectedRepos"
              :key="repo"
              variant="outline"
              size="xs"
              class="rc-mono"
            >
              {{ repo }}
            </UBadge>
          </div>
          <p
            v-if="createError"
            class="text-xs text-red-500"
          >
            {{ createError }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            @click="isCreateOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            @click="confirmCreate"
          >
            Save
          </UButton>
        </div>
      </template>
    </UModal>
  </section>
</template>
