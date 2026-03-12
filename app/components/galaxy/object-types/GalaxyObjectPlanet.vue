<script setup lang="ts">
import type { RingGeometry } from 'three'
import type { GalaxyObjectVisualProps } from './shared'
import { Color, DoubleSide } from 'three'
import { useGalaxyObjectVisualState } from './shared'
import {
  planetDetailGeometry,
  planetLowDetailGeometry,
  planetRingInnerGeometry,
  planetRingMainGeometry,
  planetRingOuterGeometry,
} from './shared-geometries'

const props = defineProps<GalaxyObjectVisualProps>()
const { colorHex, glowHex, trailHex } = useGalaxyObjectVisualState(props)

interface PlanetRingBand {
  key: string
  color: string
  emissive: string
  emissiveIntensity: number
  geometry: RingGeometry
  opacity: number
}

const atmosphereColor = computed(() => {
  return new Color(glowHex.value).lerp(new Color(colorHex.value), 0.28).getStyle()
})
const planetRingBands = computed<PlanetRingBand[]>(() => {
  const ringGlow = new Color(glowHex.value)
  const ringTrail = new Color(trailHex.value)
  const ringDust = new Color(colorHex.value).lerp(new Color('#f5f1dc'), 0.18).getStyle()

  return [
    {
      key: 'ring-inner',
      geometry: planetRingInnerGeometry,
      color: ringTrail.clone().lerp(ringGlow.clone(), 0.18).getStyle(),
      emissive: glowHex.value,
      emissiveIntensity: 0.18,
      opacity: 0.34,
    },
    {
      key: 'ring-main',
      geometry: planetRingMainGeometry,
      color: ringDust,
      emissive: trailHex.value,
      emissiveIntensity: 0.12,
      opacity: 0.26,
    },
    {
      key: 'ring-outer',
      geometry: planetRingOuterGeometry,
      color: ringGlow.clone().lerp(new Color('#ffffff'), 0.12).getStyle(),
      emissive: glowHex.value,
      emissiveIntensity: 0.08,
      opacity: 0.12,
    },
  ]
})
const highDetailScale = computed<[number, number, number]>(() => {
  return [props.selectedScale, props.selectedScale, props.selectedScale]
})
const atmosphereScale = computed<[number, number, number]>(() => {
  const scale = props.selectedScale * 1.06
  return [scale, scale * 1.01, scale]
})
</script>

<template>
  <template v-if="props.isLowDetail">
    <!-- Distant planets keep a single low-poly body. -->
    <TresMesh
      key="planet-low"
      :geometry="planetLowDetailGeometry"
      :scale="[props.selectedScale, props.selectedScale, props.selectedScale]"
    >
      <TresMeshBasicMaterial :color="colorHex" :side="DoubleSide" />
    </TresMesh>
  </template>

  <template v-else>
    <TresGroup key="planet-high">
      <!-- Main planetary body kept smooth so the surface overlays can carry the detail. -->
      <TresMesh :geometry="planetDetailGeometry" :scale="highDetailScale">
        <TresMeshStandardMaterial
          :color="colorHex"
          :emissive="glowHex"
          :emissive-intensity="0.9"
          :metalness="0.12"
          :roughness="0.32"
        />
      </TresMesh>

      <!-- Thin atmosphere shell to stop the planet from reading as a bare sphere. -->
      <TresMesh :geometry="planetDetailGeometry" :scale="atmosphereScale" :render-order="1">
        <TresMeshStandardMaterial
          :color="atmosphereColor"
          :emissive="glowHex"
          :emissive-intensity="0.28"
          transparent
          :opacity="0.18"
          :roughness="0.24"
          :metalness="0.02"
          :depth-write="false"
          :side="DoubleSide"
        />
      </TresMesh>

      <!-- Layered discs read closer to planetary rings than a tube-like torus. -->
      <TresMesh
        v-for="band in planetRingBands"
        :key="band.key"
        :geometry="band.geometry"
        :rotation="[Math.PI / 2, 0, 0]"
        :scale="[props.selectedScale, props.selectedScale, props.selectedScale]"
        :render-order="2"
      >
        <TresMeshStandardMaterial
          :color="band.color"
          :emissive="band.emissive"
          :emissive-intensity="band.emissiveIntensity"
          transparent
          :opacity="band.opacity"
          :roughness="0.92"
          :metalness="0.02"
          :depth-write="false"
          :side="DoubleSide"
        />
      </TresMesh>
    </TresGroup>
  </template>
</template>
