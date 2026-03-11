<script setup lang="ts">
import type { GalaxyObjectVisualProps } from './shared'
import { useGalaxyObjectVisualState } from './shared'
import { stationLowDetailGeometry } from './shared-geometries'

const props = defineProps<GalaxyObjectVisualProps>()
const { colorHex, glowHex, trailHex } = useGalaxyObjectVisualState(props)

const stationSpineAngles = Array.from({ length: 6 }, (_, index) => (index / 6) * Math.PI)
const stationDockTransforms = createStationDockTransforms(props.body.seed)
const stationRadiatorTransforms = createStationRadiatorTransforms(props.body.seed)

function createSeededRandom(seed: number) {
  let state = (seed ^ 0x6D2B79F5) >>> 0

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function createStationDockTransforms(seed: number) {
  const random = createSeededRandom(seed * 29 + 7)
  const moduleCount = 6

  return Array.from({ length: moduleCount }, (_, index) => {
    const angle = (index / moduleCount) * Math.PI * 2 + (random() - 0.5) * 0.06
    const radius = 1.02 + random() * 0.04

    return {
      key: `station-dock-${index}`,
      position: [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        index % 2 === 0 ? 0.16 : -0.16,
      ] as [number, number, number],
      rotation: [0, 0, angle] as [number, number, number],
      scale: [
        0.16 + random() * 0.04,
        0.12 + random() * 0.03,
        0.28 + random() * 0.08,
      ] as [number, number, number],
    }
  })
}

function createStationRadiatorTransforms(seed: number) {
  const random = createSeededRandom(seed * 37 + 19)

  return Array.from({ length: 4 }, (_, index) => {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4
    const radius = 1.34 + random() * 0.06

    return {
      key: `station-radiator-${index}`,
      position: [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0,
      ] as [number, number, number],
      rotation: [0, 0, angle] as [number, number, number],
      scale: [
        0.22 + random() * 0.04,
        0.05 + random() * 0.01,
        0.54 + random() * 0.08,
      ] as [number, number, number],
    }
  })
}
</script>

<template>
  <!-- Low-detail ring silhouette keeps the station readable at distance. -->
  <TresMesh
    v-if="props.isLowDetail"
    key="station-low"
    :geometry="stationLowDetailGeometry"
    :scale="[props.selectedScale, props.selectedScale, props.selectedScale]"
  >
    <TresMeshBasicMaterial :color="trailHex" />
  </TresMesh>

  <template v-else>
    <!-- Main torus ring that defines the station silhouette. -->
    <TresMesh
      key="station-high"
      :scale="[props.selectedScale, props.selectedScale, props.selectedScale]"
    >
      <TresTorusGeometry :args="[0.94, 0.18, 26, 92]" />
      <TresMeshStandardMaterial
        :color="colorHex"
        :emissive="glowHex"
        :emissive-intensity="1.1"
        :metalness="0.9"
        :roughness="0.18"
      />
    </TresMesh>

    <!-- Structural rings, hub pieces, docks, and radiators layered around the core ring. -->
    <TresGroup key="detail-station" :scale="[props.selectedScale * 0.9, props.selectedScale * 0.9, props.selectedScale * 0.9]">
      <!-- Outer support ring that frames the habitat torus. -->
      <TresMesh :rotation="[Math.PI / 2, 0, 0]" :scale="[1.02, 1.02, 1.02]">
        <TresTorusGeometry :args="[1.18, 0.05, 10, 112]" />
        <TresMeshStandardMaterial
          :color="trailHex"
          :emissive="glowHex"
          :emissive-intensity="0.42"
          :metalness="0.84"
          :roughness="0.24"
        />
      </TresMesh>
      <!-- Inner service ring sitting just inside the main habitat band. -->
      <TresMesh :rotation="[Math.PI / 2, 0, 0]" :scale="[0.72, 0.72, 0.72]">
        <TresTorusGeometry :args="[0.82, 0.08, 14, 80]" />
        <TresMeshStandardMaterial
          :color="trailHex"
          :emissive="glowHex"
          :emissive-intensity="0.34"
          :metalness="0.86"
          :roughness="0.22"
        />
      </TresMesh>
      <!-- Central hub where the station's spokes connect. -->
      <TresMesh :position="[0, 0, 0]">
        <TresCylinderGeometry :args="[0.22, 0.3, 0.86, 20]" />
        <TresMeshStandardMaterial
          :color="colorHex"
          :emissive="glowHex"
          :emissive-intensity="0.44"
          :metalness="0.8"
          :roughness="0.22"
        />
      </TresMesh>
      <!-- Axial spine that passes through the station center. -->
      <TresMesh :rotation="[Math.PI / 2, 0, 0]">
        <TresCylinderGeometry :args="[0.12, 0.12, 0.92, 16]" />
        <TresMeshStandardMaterial
          :color="trailHex"
          :emissive="glowHex"
          :emissive-intensity="0.38"
          :metalness="0.88"
          :roughness="0.18"
        />
      </TresMesh>
      <!-- Bright core beacon at the heart of the station. -->
      <TresMesh :position="[0, 0, 0]" :scale="[0.18, 0.18, 0.18]">
        <TresSphereGeometry :args="[1, 18, 18]" />
        <TresMeshStandardMaterial
          color="#dfe7ff"
          :emissive="glowHex"
          :emissive-intensity="0.95"
          :metalness="0.18"
          :roughness="0.22"
        />
      </TresMesh>
      <!-- Radial trusses that connect the hub to the outer ring. -->
      <TresMesh
        v-for="angle in stationSpineAngles"
        :key="`station-spine-${angle}`"
        :rotation="[0, 0, angle]"
      >
        <TresCylinderGeometry :args="[0.045, 0.045, 2.02, 10]" />
        <TresMeshStandardMaterial
          :color="trailHex"
          :emissive="glowHex"
          :emissive-intensity="0.28"
          :metalness="0.84"
          :roughness="0.22"
        />
      </TresMesh>
      <!-- Docking modules distributed around the ring. -->
      <TresMesh
        v-for="dock in stationDockTransforms"
        :key="dock.key"
        :position="dock.position"
        :rotation="dock.rotation"
        :scale="dock.scale"
      >
        <TresBoxGeometry :args="[1, 1, 1]" />
        <TresMeshStandardMaterial
          :color="colorHex"
          :emissive="glowHex"
          :emissive-intensity="0.18"
          :metalness="0.82"
          :roughness="0.2"
        />
      </TresMesh>
      <!-- Radiator panels that give the station an industrial read. -->
      <TresMesh
        v-for="radiator in stationRadiatorTransforms"
        :key="radiator.key"
        :position="radiator.position"
        :rotation="radiator.rotation"
        :scale="radiator.scale"
      >
        <TresBoxGeometry :args="[1, 1, 1]" />
        <TresMeshStandardMaterial
          :color="trailHex"
          :emissive="glowHex"
          :emissive-intensity="0.16"
          :metalness="0.74"
          :roughness="0.3"
        />
      </TresMesh>
      <!-- Forward cap attached to one end of the axial spine. -->
      <TresMesh :position="[0, 0, 0.32]" :scale="[0.22, 0.22, 0.08]">
        <TresCylinderGeometry :args="[1, 1, 1, 18]" />
        <TresMeshStandardMaterial
          :color="trailHex"
          :emissive="glowHex"
          :emissive-intensity="0.2"
          :metalness="0.78"
          :roughness="0.24"
        />
      </TresMesh>
      <!-- Rear cap mirroring the opposite end of the spine. -->
      <TresMesh :position="[0, 0, -0.32]" :scale="[0.22, 0.22, 0.08]">
        <TresCylinderGeometry :args="[1, 1, 1, 18]" />
        <TresMeshStandardMaterial
          :color="trailHex"
          :emissive="glowHex"
          :emissive-intensity="0.2"
          :metalness="0.78"
          :roughness="0.24"
        />
      </TresMesh>
    </TresGroup>
  </template>
</template>
