<script setup lang="ts">
import type { RealtimeStressTestOptions, RealtimeStressTestResult, RealtimeStressTestStatus } from '~~/shared/galaxy'
import {
  DEFAULT_REALTIME_STRESS_TEST_OPTIONS,
  isRealtimeStressLogin,
  REALTIME_STRESS_BATCH_SIZE_RANGE,
  REALTIME_STRESS_COUNT_RANGE,
  REALTIME_STRESS_INTERVAL_RANGE,
  REALTIME_STRESS_UPDATE_ROUNDS_RANGE,
} from '~~/shared/galaxy'

type RealtimeStressClearResponse = RealtimeStressTestStatus & {
  clearedUsers: number
  clearedProfiles: number
}

const props = defineProps<{
  visibleSyntheticProfileCount: number
  sceneLimit: number
  selectedUserLogin: string | null
}>()

const emit = defineEmits<{
  clearSelection: []
}>()

const stressTestEnabled = import.meta.dev
const stressTestCount = ref<number>(DEFAULT_REALTIME_STRESS_TEST_OPTIONS.count)
const stressTestBatchSize = ref<number>(DEFAULT_REALTIME_STRESS_TEST_OPTIONS.batchSize)
const stressTestIntervalMs = ref<number>(DEFAULT_REALTIME_STRESS_TEST_OPTIONS.intervalMs)
const stressTestUpdateRounds = ref<number>(DEFAULT_REALTIME_STRESS_TEST_OPTIONS.updateRounds)
const stressTestReplaceExisting = ref<boolean>(DEFAULT_REALTIME_STRESS_TEST_OPTIONS.replaceExisting)
const stressTestRunning = ref(false)
const stressTestClearing = ref(false)
const stressTestStatusLoading = ref(false)
const stressTestError = ref<string | null>(null)
const stressTestStatus = ref<RealtimeStressTestStatus | null>(null)

const stressTestStatusLabel = computed(() => {
  if (stressTestRunning.value) {
    return 'Injecting'
  }

  if (stressTestClearing.value) {
    return 'Clearing'
  }

  if (stressTestStatusLoading.value && stressTestStatus.value?.syntheticProfileCount == null) {
    return 'Checking'
  }

  return (stressTestStatus.value?.syntheticProfileCount ?? 0) > 0 ? 'Loaded' : 'Idle'
})

const stressTestBusy = computed(() => {
  return stressTestRunning.value || stressTestClearing.value
})

function setStressTestCount(value: number) {
  stressTestCount.value = clampStressNumber(
    value,
    REALTIME_STRESS_COUNT_RANGE.min,
    REALTIME_STRESS_COUNT_RANGE.max,
    DEFAULT_REALTIME_STRESS_TEST_OPTIONS.count,
  )
}

function setStressTestBatchSize(value: number) {
  stressTestBatchSize.value = clampStressNumber(
    value,
    REALTIME_STRESS_BATCH_SIZE_RANGE.min,
    REALTIME_STRESS_BATCH_SIZE_RANGE.max,
    DEFAULT_REALTIME_STRESS_TEST_OPTIONS.batchSize,
  )
}

function setStressTestIntervalMs(value: number) {
  stressTestIntervalMs.value = clampStressNumber(
    value,
    REALTIME_STRESS_INTERVAL_RANGE.min,
    REALTIME_STRESS_INTERVAL_RANGE.max,
    DEFAULT_REALTIME_STRESS_TEST_OPTIONS.intervalMs,
  )
}

function setStressTestUpdateRounds(value: number) {
  stressTestUpdateRounds.value = clampStressNumber(
    value,
    REALTIME_STRESS_UPDATE_ROUNDS_RANGE.min,
    REALTIME_STRESS_UPDATE_ROUNDS_RANGE.max,
    DEFAULT_REALTIME_STRESS_TEST_OPTIONS.updateRounds,
  )
}

function updateStressTestCount(event: Event) {
  setStressTestCount(Number((event.target as HTMLInputElement).value))
}

function updateStressTestBatchSize(event: Event) {
  setStressTestBatchSize(Number((event.target as HTMLInputElement).value))
}

function updateStressTestIntervalMs(event: Event) {
  setStressTestIntervalMs(Number((event.target as HTMLInputElement).value))
}

function updateStressTestUpdateRounds(event: Event) {
  setStressTestUpdateRounds(Number((event.target as HTMLInputElement).value))
}

function clearSyntheticSelectionIfNeeded() {
  if (props.selectedUserLogin && isRealtimeStressLogin(props.selectedUserLogin)) {
    emit('clearSelection')
  }
}

async function refreshStressTestStatus() {
  if (!stressTestEnabled || stressTestBusy.value) {
    return
  }

  stressTestStatusLoading.value = true
  stressTestError.value = null

  try {
    stressTestStatus.value = await $fetch<RealtimeStressTestStatus>('/api/stress/rstore')
  }
  catch (error) {
    stressTestError.value = getRequestErrorMessage(error)
  }
  finally {
    stressTestStatusLoading.value = false
  }
}

async function runStressTest() {
  if (!stressTestEnabled || stressTestBusy.value) {
    return
  }

  stressTestRunning.value = true
  stressTestError.value = null

  if (stressTestReplaceExisting.value) {
    clearSyntheticSelectionIfNeeded()
  }

  try {
    const response = await $fetch<RealtimeStressTestResult>('/api/stress/rstore', {
      method: 'POST',
      body: {
        count: stressTestCount.value,
        batchSize: stressTestBatchSize.value,
        intervalMs: stressTestIntervalMs.value,
        updateRounds: stressTestUpdateRounds.value,
        replaceExisting: stressTestReplaceExisting.value,
      } satisfies RealtimeStressTestOptions,
    })

    stressTestStatus.value = {
      syntheticUserCount: response.syntheticUserCount,
      syntheticProfileCount: response.syntheticProfileCount,
    }
  }
  catch (error) {
    stressTestError.value = getRequestErrorMessage(error)
  }
  finally {
    stressTestRunning.value = false
  }
}

async function clearStressTest() {
  if (!stressTestEnabled || stressTestBusy.value) {
    return
  }

  stressTestClearing.value = true
  stressTestError.value = null
  clearSyntheticSelectionIfNeeded()

  try {
    const response = await $fetch<RealtimeStressClearResponse>('/api/stress/rstore', {
      method: 'DELETE',
    })

    stressTestStatus.value = {
      syntheticUserCount: response.syntheticUserCount,
      syntheticProfileCount: response.syntheticProfileCount,
    }
  }
  catch (error) {
    stressTestError.value = getRequestErrorMessage(error)
  }
  finally {
    stressTestClearing.value = false
  }
}

function clampStressNumber(value: number, min: number, max: number, fallback: number) {
  const normalized = Number(value)

  if (!Number.isFinite(normalized)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(normalized)))
}

function getRequestErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const maybeError = error as {
      data?: {
        message?: string
        statusMessage?: string
      }
      message?: string
      statusMessage?: string
    }

    return maybeError.data?.statusMessage
      ?? maybeError.data?.message
      ?? maybeError.statusMessage
      ?? maybeError.message
      ?? 'Realtime stress test request failed.'
  }

  return 'Realtime stress test request failed.'
}

onMounted(() => {
  if (stressTestEnabled) {
    void refreshStressTestStatus()
  }
})
</script>

<template>
  <div
    v-if="stressTestEnabled"
    class="space-y-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-[11px] uppercase tracking-[0.24em] text-white/42">
          Realtime stress
        </p>
      </div>

      <span
        class="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.24em]"
        :class="stressTestBusy
          ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100'
          : 'border-white/10 bg-white/5 text-white/55'"
      >
        {{ stressTestStatusLabel }}
      </span>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3">
        <p class="text-[11px] uppercase tracking-[0.24em] text-white/42">
          Persisted synthetic profiles
        </p>
        <p class="mt-2 text-2xl font-medium text-white">
          {{ stressTestStatus?.syntheticProfileCount ?? '...' }}
        </p>
        <p class="mt-1 text-sm text-white/58">
          {{ stressTestStatus?.syntheticUserCount ?? '...' }} synthetic users currently in the database
        </p>
      </div>

      <div class="rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3">
        <p class="text-[11px] uppercase tracking-[0.24em] text-white/42">
          Visible in live scene
        </p>
        <p class="mt-2 text-2xl font-medium text-white">
          {{ visibleSyntheticProfileCount }}
        </p>
        <p class="mt-1 text-sm text-white/58">
          The current live query tracks the latest {{ sceneLimit }} profiles.
        </p>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-4">
      <label class="space-y-2 text-sm">
        <span class="text-[11px] uppercase tracking-[0.24em] text-white/42">Synthetic profiles</span>
        <input
          :value="stressTestCount"
          :min="REALTIME_STRESS_COUNT_RANGE.min"
          :max="REALTIME_STRESS_COUNT_RANGE.max"
          :step="REALTIME_STRESS_COUNT_RANGE.step"
          :disabled="stressTestBusy"
          type="number"
          inputmode="numeric"
          class="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/45 disabled:cursor-not-allowed disabled:opacity-60"
          @input="updateStressTestCount"
        >
      </label>

      <label class="space-y-2 text-sm">
        <span class="text-[11px] uppercase tracking-[0.24em] text-white/42">Batch size</span>
        <input
          :value="stressTestBatchSize"
          :min="REALTIME_STRESS_BATCH_SIZE_RANGE.min"
          :max="REALTIME_STRESS_BATCH_SIZE_RANGE.max"
          :step="REALTIME_STRESS_BATCH_SIZE_RANGE.step"
          :disabled="stressTestBusy"
          type="number"
          inputmode="numeric"
          class="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/45 disabled:cursor-not-allowed disabled:opacity-60"
          @input="updateStressTestBatchSize"
        >
      </label>

      <label class="space-y-2 text-sm">
        <span class="text-[11px] uppercase tracking-[0.24em] text-white/42">Delay between batches</span>
        <input
          :value="stressTestIntervalMs"
          :min="REALTIME_STRESS_INTERVAL_RANGE.min"
          :max="REALTIME_STRESS_INTERVAL_RANGE.max"
          :step="REALTIME_STRESS_INTERVAL_RANGE.step"
          :disabled="stressTestBusy"
          type="number"
          inputmode="numeric"
          class="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/45 disabled:cursor-not-allowed disabled:opacity-60"
          @input="updateStressTestIntervalMs"
        >
      </label>

      <label class="space-y-2 text-sm">
        <span class="text-[11px] uppercase tracking-[0.24em] text-white/42">Update rounds</span>
        <input
          :value="stressTestUpdateRounds"
          :min="REALTIME_STRESS_UPDATE_ROUNDS_RANGE.min"
          :max="REALTIME_STRESS_UPDATE_ROUNDS_RANGE.max"
          :step="REALTIME_STRESS_UPDATE_ROUNDS_RANGE.step"
          :disabled="stressTestBusy"
          type="number"
          inputmode="numeric"
          class="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/45 disabled:cursor-not-allowed disabled:opacity-60"
          @input="updateStressTestUpdateRounds"
        >
      </label>
    </div>

    <label class="flex items-start gap-3 rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3 text-sm text-white/70">
      <input
        v-model="stressTestReplaceExisting"
        :disabled="stressTestBusy"
        type="checkbox"
        class="mt-1 size-4 rounded border-white/20 bg-slate-950/60 text-cyan-300 disabled:cursor-not-allowed"
      >
      <span>Replace existing synthetic rows before each run instead of appending more records.</span>
    </label>

    <div class="grid gap-2 sm:grid-cols-3">
      <UButton
        block
        color="info"
        variant="solid"
        icon="lucide:radio-tower"
        class="justify-center rounded-full"
        :loading="stressTestRunning"
        :disabled="stressTestBusy"
        @click="runStressTest"
      >
        {{ stressTestRunning ? 'Injecting realtime load' : 'Inject realtime load' }}
      </UButton>

      <UButton
        block
        color="warning"
        variant="ghost"
        icon="lucide:trash-2"
        class="justify-center rounded-full"
        :loading="stressTestClearing"
        :disabled="stressTestBusy"
        @click="clearStressTest"
      >
        {{ stressTestClearing ? 'Clearing synthetic rows' : 'Clear synthetic rows' }}
      </UButton>

      <UButton
        block
        color="neutral"
        variant="ghost"
        icon="lucide:refresh-cw"
        class="justify-center rounded-full"
        :loading="stressTestStatusLoading"
        :disabled="stressTestBusy"
        @click="refreshStressTestStatus"
      >
        Refresh counts
      </UButton>
    </div>

    <p v-if="stressTestError" class="rounded-2xl border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-amber-100">
      {{ stressTestError }}
    </p>

    <p class="text-xs leading-5 text-white/46">
      Development only. This writes real `users` and `celestialProfiles` rows, then forwards matching create, update, and delete events through rstore realtime.
    </p>
  </div>
</template>
