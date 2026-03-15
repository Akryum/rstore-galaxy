<script setup lang="ts">
import type { SceneProfileItem } from '~/types/galaxy'
import GalaxyRecentProfileEntry from './GalaxyRecentProfileEntry.vue'

withDefaults(defineProps<{
  compact?: boolean
  items: SceneProfileItem[]
}>(), {
  compact: false,
})

defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <section
    :class="compact
      ? 'rounded-[1.4rem] border border-white/8 bg-slate-950/52 p-3 shadow-xl shadow-slate-950/20 backdrop-blur-xl'
      : 'rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4'"
  >
    <div class="flex items-center justify-between gap-3">
      <p class="text-[11px] uppercase tracking-[0.28em] text-white/42">
        Recently created
      </p>
    </div>

    <div
      v-if="compact"
      class="mt-3 flex gap-3 overflow-x-auto pb-1"
    >
      <GalaxyRecentProfileEntry
        v-for="profile in items"
        :key="profile.id"
        :profile="profile"
        compact
        @select="$emit('select', $event)"
      />
    </div>

    <div v-else class="mt-4 space-y-2">
      <GalaxyRecentProfileEntry
        v-for="profile in items"
        :key="profile.id"
        :profile="profile"
        @select="$emit('select', $event)"
      />
    </div>
  </section>
</template>
