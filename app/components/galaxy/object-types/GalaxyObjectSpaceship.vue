<script setup lang="ts">
import type { GalaxyObjectVisualProps } from './shared'
import { useGalaxyObjectVisualState } from './shared'
import {
  spaceshipBridgeLightGeometry,
  spaceshipDeckGeometry,
  spaceshipHullGeometry,
  spaceshipLowDetailGeometry,
} from './shared-geometries'

const props = defineProps<GalaxyObjectVisualProps>()
const { colorHex, glowHex, trailHex } = useGalaxyObjectVisualState(props)

const SHIP_SCALE_MULTIPLIER = 2.25
const overallScale = computed(() => props.selectedScale * SHIP_SCALE_MULTIPLIER)
const bodyScale = computed<[number, number, number]>(() => {
  return [overallScale.value * 1.82, overallScale.value * 0.26, overallScale.value * 1.02]
})
const detailScale = computed<[number, number, number]>(() => {
  return [overallScale.value, overallScale.value, overallScale.value]
})
</script>

<template>
  <!-- Low-detail hull keeps the destroyer's deck and wing silhouette at distance. -->
  <TresMesh
    v-if="props.isLowDetail"
    key="spaceship-low"
    :geometry="spaceshipLowDetailGeometry"
    :scale="detailScale"
  >
    <TresMeshBasicMaterial :color="colorHex" />
  </TresMesh>

  <template v-else>
    <!-- Primary hull extrusion that defines the ship's overall body. -->
    <TresMesh
      key="spaceship-high"
      :geometry="spaceshipHullGeometry"
      :scale="bodyScale"
    >
      <TresMeshStandardMaterial
        :color="colorHex"
        :emissive="glowHex"
        :emissive-intensity="0.84"
        :metalness="0.74"
        :roughness="0.26"
      />
    </TresMesh>

    <!-- Bridge, fins, and engine elements layered on top of the main hull. -->
    <TresGroup key="detail-spaceship" :scale="detailScale">
      <!-- Main command deck running along the top of the hull. -->
      <TresMesh :geometry="spaceshipDeckGeometry" :position="[0.04, 0.09, 0]" :scale="[1.02, 0.98, 1.02]">
        <TresMeshStandardMaterial
          :color="trailHex"
          :emissive="glowHex"
          :emissive-intensity="0.24"
          :metalness="0.76"
          :roughness="0.28"
        />
      </TresMesh>
      <!-- Secondary bridge tier near the rear of the ship. -->
      <TresMesh :geometry="spaceshipDeckGeometry" :position="[-0.2, 0.18, 0]" :scale="[0.58, 0.72, 0.58]">
        <TresMeshStandardMaterial
          :color="trailHex"
          :emissive="glowHex"
          :emissive-intensity="0.18"
          :metalness="0.78"
          :roughness="0.28"
        />
      </TresMesh>
      <!-- Rear superstructure block that lifts the bridge profile. -->
      <TresMesh :position="[-0.58, 0.3, 0]" :scale="[0.38, 0.13, 0.28]">
        <TresBoxGeometry :args="[0.96, 1, 1]" />
        <TresMeshStandardMaterial
          :color="trailHex"
          :emissive="glowHex"
          :emissive-intensity="0.18"
          :metalness="0.78"
          :roughness="0.24"
        />
      </TresMesh>
      <!-- Upper sensor mast above the rear bridge. -->
      <TresMesh :position="[-0.78, 0.48, 0]" :scale="[0.16, 0.22, 0.16]">
        <TresBoxGeometry :args="[0.56, 1, 1]" />
        <TresMeshStandardMaterial
          :color="trailHex"
          :emissive="glowHex"
          :emissive-intensity="0.16"
          :metalness="0.8"
          :roughness="0.24"
        />
      </TresMesh>
      <!-- Thin top bar that caps the bridge tower. -->
      <TresMesh :position="[-0.88, 0.62, 0]" :scale="[0.24, 0.05, 0.18]">
        <TresBoxGeometry :args="[1.06, 1, 1]" />
        <TresMeshStandardMaterial
          :color="trailHex"
          :emissive="glowHex"
          :emissive-intensity="0.12"
          :metalness="0.82"
          :roughness="0.22"
        />
      </TresMesh>
      <!-- Port bridge light that gives the tower a cockpit read. -->
      <TresMesh :geometry="spaceshipBridgeLightGeometry" :position="[-0.82, 0.66, 0.12]" :scale="[0.07, 0.07, 0.07]">
        <TresMeshStandardMaterial
          color="#d9e2ff"
          :emissive="glowHex"
          :emissive-intensity="0.24"
          :metalness="0.14"
          :roughness="0.26"
        />
      </TresMesh>
      <!-- Starboard bridge light mirroring the port side. -->
      <TresMesh :geometry="spaceshipBridgeLightGeometry" :position="[-0.82, 0.66, -0.12]" :scale="[0.07, 0.07, 0.07]">
        <TresMeshStandardMaterial
          color="#d9e2ff"
          :emissive="glowHex"
          :emissive-intensity="0.28"
          :metalness="0.14"
          :roughness="0.26"
        />
      </TresMesh>
      <!-- Port wing/strake that widens the ship's midsection. -->
      <TresMesh :position="[-0.18, 0.04, 0.66]" :scale="[0.54, 0.05, 0.08]">
        <TresBoxGeometry :args="[1.2, 1, 1]" />
        <TresMeshStandardMaterial
          :color="colorHex"
          :emissive="glowHex"
          :emissive-intensity="0.06"
          :metalness="0.74"
          :roughness="0.34"
        />
      </TresMesh>
      <!-- Starboard wing/strake matching the opposite side. -->
      <TresMesh :position="[-0.18, 0.04, -0.66]" :scale="[0.54, 0.05, 0.08]">
        <TresBoxGeometry :args="[1.2, 1, 1]" />
        <TresMeshStandardMaterial
          :color="colorHex"
          :emissive="glowHex"
          :emissive-intensity="0.06"
          :metalness="0.74"
          :roughness="0.34"
        />
      </TresMesh>
      <!-- Ventral keel that makes the underside feel engineered instead of flat. -->
      <TresMesh :position="[0.14, -0.08, 0]" :scale="[0.94, 0.05, 0.46]">
        <TresBoxGeometry :args="[1.44, 1, 1]" />
        <TresMeshStandardMaterial
          :color="colorHex"
          :emissive="glowHex"
          :emissive-intensity="0.08"
          :metalness="0.72"
          :roughness="0.32"
        />
      </TresMesh>
      <!-- Port engine glow orb. -->
      <TresMesh :geometry="spaceshipBridgeLightGeometry" :position="[-1.06, -0.01, 0.18]" :scale="[0.09, 0.09, 0.14]">
        <TresMeshStandardMaterial
          :color="glowHex"
          :emissive="glowHex"
          :emissive-intensity="1.26"
          :metalness="0.18"
          :roughness="0.2"
        />
      </TresMesh>
      <!-- Main engine core at the center of the stern. -->
      <TresMesh :geometry="spaceshipBridgeLightGeometry" :position="[-1.08, -0.01, 0]" :scale="[0.11, 0.11, 0.16]">
        <TresMeshStandardMaterial
          :color="glowHex"
          :emissive="glowHex"
          :emissive-intensity="1.42"
          :metalness="0.18"
          :roughness="0.18"
        />
      </TresMesh>
      <!-- Starboard engine glow orb. -->
      <TresMesh :geometry="spaceshipBridgeLightGeometry" :position="[-1.06, -0.01, -0.18]" :scale="[0.09, 0.09, 0.14]">
        <TresMeshStandardMaterial
          :color="glowHex"
          :emissive="glowHex"
          :emissive-intensity="1.26"
          :metalness="0.18"
          :roughness="0.2"
        />
      </TresMesh>
    </TresGroup>
  </template>
</template>
