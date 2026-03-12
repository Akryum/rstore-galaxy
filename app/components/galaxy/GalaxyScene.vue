<script setup lang="ts">
import type { SceneProfileItem } from '~/types/galaxy'
import { BloomPmndrs, EffectComposerPmndrs, NoisePmndrs, ScanlinePmndrs, VignettePmndrs } from '@tresjs/post-processing'
import { BlendFunction } from 'postprocessing'

const props = defineProps<{
  items: SceneProfileItem[]
  selectedId: string | null
  recenterSelectionEnabled: boolean
}>()

defineEmits<{
  select: [id: string | null]
}>()

const PERFORMANCE_MODE_ITEM_COUNT = 280
const ULTRA_PERFORMANCE_MODE_ITEM_COUNT = 700

const itemCount = computed(() => props.items.length)
const performanceMode = computed(() => itemCount.value >= PERFORMANCE_MODE_ITEM_COUNT)
const ultraPerformanceMode = computed(() => itemCount.value >= ULTRA_PERFORMANCE_MODE_ITEM_COUNT)
</script>

<template>
  <!-- Absolute wrapper so the WebGL canvas fills the full scene area. -->
  <div class="absolute inset-0">
    <!-- Root Tres canvas that owns the renderer and scene graph. -->
    <TresCanvas
      :alpha="true"
      clear-color="#00000055"
      class="size-full"
    >
      <!-- Scene content component that builds the camera, lights, and orbiting bodies. -->
      <GalaxySceneContent
        :items="items"
        :selected-id="selectedId"
        :recenter-selection-enabled="recenterSelectionEnabled"
        :performance-mode="performanceMode"
        :ultra-performance-mode="ultraPerformanceMode"
        @select="$emit('select', $event)"
      />

      <!-- Post-processing stack for glow and sci-fi texture -->
      <Suspense>
        <EffectComposerPmndrs>
          <!-- Bloom boosts emissive glow -->
          <BloomPmndrs
            :radius="ultraPerformanceMode ? 0.35 : 0.5"
            :intensity="ultraPerformanceMode ? 1.1 : 1.5"
            :luminance-threshold="ultraPerformanceMode ? 0.18 : 0.1"
            :luminance-smoothing="ultraPerformanceMode ? 0.82 : 0.7"
          />
          <!-- FXAA smooths jagged edges -->
          <FXAAPmndrs
            v-if="!isMobile"
            :samples="performanceMode ? 2 : 4"
          />
          <!-- <SMAAPmndrs
            v-if="!isMobile"
            :preset="SMAAPreset.LOW"
          /> -->
          <!-- Subtle sensor-like noise -->
          <NoisePmndrs
            premultiply
            :blend-function="BlendFunction.SCREEN"
          />
          <!-- Moving scanlines for sci-fi texture -->
          <ScanlinePmndrs
            :density="ultraPerformanceMode ? 1.05 : 1.25"
            :opacity="ultraPerformanceMode ? 0.07 : 0.1"
            :scroll-speed="0.01"
          />
          <!-- Vignette -->
          <VignettePmndrs
            :darkness="ultraPerformanceMode ? 0.78 : 0.9"
            :offset="0.2"
          />
        </EffectComposerPmndrs>
      </Suspense>
    </TresCanvas>
  </div>
</template>
