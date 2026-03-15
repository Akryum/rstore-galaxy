<script setup lang="ts">
import type { SceneProfileItem } from '~/types/galaxy'
import { useTimeAgo } from '@vueuse/core'
import { BODY_TYPE_META } from '~~/shared/galaxy'

const props = withDefaults(defineProps<{
  compact?: boolean
  profile: SceneProfileItem
}>(), {
  compact: false,
})

defineEmits<{
  select: [id: string]
}>()

const createdAtTimeAgo = useTimeAgo(computed(() => normalizeDate(props.profile.user.createdAt)))

function normalizeDate(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  return new Date()
}
</script>

<template>
  <button
    type="button"
    :class="compact
      ? 'min-w-44 shrink-0 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 text-left transition hover:bg-white/[0.08]'
      : 'flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:bg-white/[0.07]'"
    @click="$emit('select', profile.id)"
  >
    <div
      v-if="compact"
      class="flex items-center gap-3"
    >
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

    <template v-if="compact">
      <p class="mt-3 text-[11px] uppercase tracking-[0.24em] text-white/42">
        {{ BODY_TYPE_META[profile.bodyType].label }}
      </p>
      <p class="mt-1 text-xs text-white/52">
        {{ createdAtTimeAgo }}
      </p>
    </template>

    <template v-else>
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
        <p class="mt-1 text-xs text-white/52">
          {{ createdAtTimeAgo }}
        </p>
      </div>
    </template>
  </button>
</template>
