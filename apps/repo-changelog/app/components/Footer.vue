<template>
  <footer class="w-full border-t border-[var(--rule)] bg-[color-mix(in_oklab,var(--paper)_85%,transparent)] backdrop-blur-md">
    <div class="mx-auto max-w-[1600px] px-4 sm:px-6">
      <div class="flex flex-col items-center justify-between gap-3 py-5 text-xs text-[var(--ink-soft)] sm:flex-row">
        <div class="flex items-center gap-2">
          <span class="rc-kicker">Printed from</span>
          <span class="rc-mono text-[var(--ink)]">repo-changelog</span>
          <span class="text-[var(--rule-strong)]">—</span>
          <span class="rc-kicker">Wire service</span>
          <ULink
            to="https://ungh.cc"
            target="_blank"
            class="rc-mono text-[var(--ink)] underline-offset-2 hover:text-[var(--press)] hover:underline"
          >
            ungh.cc
          </ULink>
        </div>
        <div class="rc-mono text-[var(--ink-faint)]">
          © 2025
          <ULink
            to="https://github.com/WuChenDi"
            target="_blank"
            class="underline-offset-2 hover:text-[var(--press)] hover:underline"
          >
            wudi
          </ULink>
          · All rights reserved
        </div>
      </div>
    </div>
  </footer>
</template>
