<script setup lang="ts">
import type { GalaxyObjectVisualProps } from './shared'
import { useGalaxyObjectVisualState } from './shared'

const props = defineProps<GalaxyObjectVisualProps>()
const { colorHex, glowHex } = useGalaxyObjectVisualState(props)
</script>

<template>
  <!-- Low-detail proxy used when the fallback body is far from the camera. -->
  <TresMesh
    :key="`fallback-${props.isLowDetail ? 'low' : 'high'}`"
    :scale="[props.selectedScale, props.selectedScale, props.selectedScale]"
  >
    <template v-if="props.isLowDetail">
      <TresOctahedronGeometry :args="[0.72, 0]" />
      <TresMeshBasicMaterial :color="colorHex" />
    </template>

    <template v-else>
      <!-- High-detail glowing orb used for unknown body types. -->
      <TresSphereGeometry :args="[0.72, 20, 20]" />
      <TresMeshStandardMaterial
        :color="colorHex"
        :emissive="glowHex"
        :emissive-intensity="1.25"
        :metalness="0.14"
        :roughness="0.4"
      />
    </template>
  </TresMesh>
</template>
