<script setup lang="ts">
import type { SceneProfileItem } from '~/types/galaxy'
import { BODY_TYPE_META } from '~~/shared/galaxy'

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
      <button
        v-for="profile in items"
        :key="profile.id"
        type="button"
        class="min-w-44 shrink-0 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 text-left transition hover:bg-white/[0.08]"
        @click="$emit('select', profile.id)"
      >
        <div class="flex items-center gap-3">
          <UAvatar
            :src="profile.user.avatarUrl"
            :alt="profile.user.login"
            size="md"
            class="ring ring-white/10"
          />
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-white">
              {{ profile.user.name || profile.user.login }}
            </p>
            <p class="truncate text-xs text-cyan-100/68">
              @{{ profile.user.login }}
            </p>
          </div>
        </div>

        <p class="mt-3 text-[11px] uppercase tracking-[0.24em] text-white/42">
          {{ BODY_TYPE_META[profile.bodyType].label }}
        </p>
      </button>
    </div>

    <div v-else class="mt-4 space-y-2">
      <button
        v-for="profile in items"
        :key="profile.id"
        type="button"
        class="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:bg-white/[0.07]"
        @click="$emit('select', profile.id)"
      >
        <UAvatar
          :src="profile.user.avatarUrl"
          :alt="profile.user.login"
          size="md"
          class="ring ring-white/10"
        />

        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-white">
            {{ profile.user.name || profile.user.login }}
          </p>
          <p class="truncate text-xs text-cyan-100/68">
            @{{ profile.user.login }}
          </p>
        </div>

        <div class="shrink-0 text-right">
          <p class="text-[11px] uppercase tracking-[0.24em] text-white/42">
            {{ BODY_TYPE_META[profile.bodyType].label }}
          </p>
        </div>
      </button>
    </div>
  </section>
</template>
