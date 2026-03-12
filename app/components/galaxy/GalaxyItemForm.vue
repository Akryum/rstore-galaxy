<script lang="ts" setup>
import type { BadgeProps } from '@nuxt/ui'
import {
  BODY_TYPE_META,
  BODY_TYPES,
  clampOrbitDistance,
  clampOrbitSpeed,
  formatOrbitDistance,
  formatOrbitSpeed,
  GALAXY_COLORS,
  ORBIT_DISTANCE_RANGE,
  ORBIT_SPEED_RANGE,
} from '~~/shared/galaxy'

const props = defineProps<{
  profile: StoreWrappedItem<'celestialProfiles'>
}>()

// updateForm wires the controls directly to the selected rstore item.
const form = await props.profile.$updateForm()
const formWithChanges = form as typeof form & {
  $hasChanges: () => boolean
}

form.orbitDistance = clampOrbitDistance(Number(form.orbitDistance))
form.orbitSpeed = clampOrbitSpeed(Number(form.orbitSpeed))

const bodyTypeItems = BODY_TYPES.map(bodyType => ({
  label: BODY_TYPE_META[bodyType].label,
  value: bodyType,
}))

const hasUnsavedChanges = computed(() => {
  return formWithChanges.$hasChanges()
})

const saveState = computed<{
  label: string
  color: BadgeProps['color']
  icon: string | undefined
}>(() => {
  if (form.$loading) {
    return {
      label: 'Saving',
      color: 'info',
      icon: undefined,
    }
  }

  if (form.$error) {
    return {
      label: 'Error',
      color: 'error',
      icon: 'lucide:circle-alert',
    }
  }

  if (hasUnsavedChanges.value) {
    return {
      label: 'Unsaved',
      color: 'neutral',
      icon: undefined,
    }
  }

  return {
    label: 'Saved',
    color: 'success',
    icon: 'lucide:check',
  }
})

async function saveForm() {
  form.orbitDistance = clampOrbitDistance(Number(form.orbitDistance))
  form.orbitSpeed = clampOrbitSpeed(Number(form.orbitSpeed))
  await form.$submit()
}

// Small debounce keeps the demo feeling immediate without spamming writes.
const autoSave = useDebounceFn(() => {
  if (hasUnsavedChanges.value) {
    saveForm()
  }
}, 500)

watch(form, autoSave, {
  deep: true,
})
</script>

<template>
  <div class="space-y-4 rounded-[1.5rem] border border-cyan-300/15 bg-cyan-400/[0.04] px-4 py-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-[11px] uppercase tracking-[0.24em] text-cyan-100/40">
          Your controls
        </p>
      </div>

      <UBadge
        :color="saveState.color"
        :icon="saveState.icon"
        variant="soft"
      >
        {{ saveState.label }}
      </UBadge>
    </div>

    <div class="space-y-2">
      <label class="text-[11px] uppercase tracking-[0.24em] text-white/42">Object type</label>
      <USelect
        v-model="form.bodyType"
        :items="bodyTypeItems"
        class="w-full"
        color="neutral"
        variant="subtle"
      />
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <label class="text-[11px] uppercase tracking-[0.24em] text-white/42">Orbit distance</label>
        <span class="text-sm text-white">{{ formatOrbitDistance(form.orbitDistance) }}</span>
      </div>
      <USlider
        v-model="form.orbitDistance"
        :min="ORBIT_DISTANCE_RANGE.min"
        :max="ORBIT_DISTANCE_RANGE.max"
        :step="ORBIT_DISTANCE_RANGE.step"
        color="info"
        tooltip
      />
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <label class="text-[11px] uppercase tracking-[0.24em] text-white/42">Orbit speed</label>
        <span class="text-sm text-white">{{ formatOrbitSpeed(form.orbitSpeed) }}</span>
      </div>
      <USlider
        v-model="form.orbitSpeed"
        :min="ORBIT_SPEED_RANGE.min"
        :max="ORBIT_SPEED_RANGE.max"
        :step="ORBIT_SPEED_RANGE.step"
        color="warning"
      />
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <label class="text-[11px] uppercase tracking-[0.24em] text-white/42">Color</label>
        <span class="text-sm text-white">
          {{ GALAXY_COLORS.find(color => color.token === form!.colorToken)?.label }}
        </span>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="color in GALAXY_COLORS"
          :key="color.token"
          type="button"
          class="group rounded-2xl border px-2 py-3 transition flex flex-col items-center justify-start"
          :class="form.colorToken === color.token
            ? 'border-white/70 bg-white/10'
            : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'"
          @click="form.colorToken = color.token"
        >
          <span
            class="mx-auto block size-8 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            :style="{ background: color.hex, boxShadow: `0 0 22px ${color.glow}` }"
          />
          <span class="mt-2 block text-[11px] font-medium leading-4 text-white/75">
            {{ color.label }}
          </span>
        </button>
      </div>
    </div>

    <p v-if="form.$error" class="rounded-2xl border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
      {{ form.$error }}
    </p>
  </div>
</template>
