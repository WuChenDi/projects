<template>
  <footer class="mt-12 w-full border-t border-[var(--rc-border)]">
    <div class="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-[var(--ui-text-muted)] sm:flex-row sm:px-6">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-git-branch"
          class="size-3.5"
        />
        <span class="rc-mono">repo-changelog</span>
        <span class="opacity-40">·</span>
        <span>Data via</span>
        <ULink
          to="https://ungh.cc"
          target="_blank"
          class="rc-mono hover:text-[var(--ui-color-primary-400)]"
        >
          ungh.cc
        </ULink>
      </div>
      <div class="rc-mono opacity-60">
        © 2025
        <ULink
          to="https://github.com/WuChenDi"
          target="_blank"
          class="hover:text-[var(--ui-color-primary-400)]"
        >
          wudi
        </ULink>
      </div>
    </div>
  </footer>
</template>
