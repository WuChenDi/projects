<script setup lang="ts">
const colorMode = useColorMode()

const ready = computed(() => !colorMode.unknown)
</script>

<template>
  <div class="rc-grain relative flex min-h-screen w-full flex-col bg-[var(--paper)] text-[var(--ink)]">
    <!-- Faint press-red wash bleeding from the top, like wet ink on the masthead -->
    <div
      v-if="ready"
      class="pointer-events-none fixed inset-x-0 top-0 z-[-1] h-64"
      :style="{
        background:
          'radial-gradient(120% 100% at 50% 0%, color-mix(in oklab, var(--press) 9%, transparent), transparent 70%)'
      }"
    />
    <slot />
  </div>
</template>
