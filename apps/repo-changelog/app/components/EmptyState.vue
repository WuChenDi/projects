<script setup lang="ts">
interface Props {
  icon?: string
  title?: string
  description?: string
}

withDefaults(defineProps<Props>(), {
  icon: 'i-lucide-package-search',
  title: 'No repositories selected yet',
  description: 'Search and add the open source projects you want to track'
})
</script>

<template>
  <div class="text-center py-8 sm:py-12">
    <div class="text-muted-foreground mb-4">
      <UIcon
        :name="icon"
        class="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50"
      />
      <p class="text-base sm:text-lg font-medium mb-2">
        {{ title }}
      </p>
      <p class="text-sm px-4">
        {{ description }}
      </p>
    </div>
  </div>
</template>
