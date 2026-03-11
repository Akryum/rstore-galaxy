<script setup lang="ts">
import type { GalaxyObjectVisualProps } from './shared'
import { useGalaxyObjectVisualState } from './shared'
import { asteroidCoreGeometry, asteroidLowDetailGeometry } from './shared-geometries'

const props = defineProps<GalaxyObjectVisualProps>()
const { colorHex, glowHex } = useGalaxyObjectVisualState(props)
</script>

<template>
  <!-- Low-detail rock proxy used when the asteroid is distant. -->
  <TresMesh
    v-if="props.isLowDetail"
    key="asteroid-low"
    :geometry="asteroidLowDetailGeometry"
    :scale="[props.selectedScale, props.selectedScale, props.selectedScale]"
  >
    <TresMeshBasicMaterial :color="colorHex" />
  </TresMesh>

  <template v-else>
    <!-- Main distorted asteroid core that defines the overall silhouette. -->
    <TresMesh
      key="asteroid-high"
      :geometry="asteroidCoreGeometry"
      :scale="[props.selectedScale, props.selectedScale, props.selectedScale]"
    >
      <TresMeshStandardMaterial
        :color="colorHex"
        :emissive="glowHex"
        :emissive-intensity="0.35"
        :flat-shading="true"
        :metalness="0.08"
        :roughness="0.94"
      />
    </TresMesh>
  </template>
</template>
