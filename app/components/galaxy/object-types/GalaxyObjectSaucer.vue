<script setup lang="ts">
import type { InstancedMesh } from 'three'
import type { GalaxyObjectVisualProps } from './shared'
import { Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { useGalaxyObjectVisualState } from './shared'
import { saucerBoltGeometry, saucerLowDetailGeometry } from './shared-geometries'

const props = defineProps<GalaxyObjectVisualProps>()
const { scale: sceneBodyScale, colorHex, glowHex, trailHex } = useGalaxyObjectVisualState(props)

interface SaucerTransform {
  key: string
  position: [number, number, number]
  rotation?: [number, number, number]
  scale: [number, number, number]
}

const bodyScale = computed<[number, number, number]>(() => {
  return [props.selectedScale * 1.22, props.selectedScale * 0.48, props.selectedScale * 1.22]
})

const saucerHullPlateTransforms = createSaucerHullPlateTransforms()
const saucerBoltTransforms = createSaucerBoltTransforms()
const saucerWindowTransforms = createSaucerWindowTransforms()
const saucerRimLightTransforms = createSaucerRimLightTransforms()
const saucerUndersidePodTransforms = createSaucerUndersidePodTransforms()
const saucerBoltMeshRef = shallowRef<any>(null)
const saucerBoltMaterial = new MeshStandardMaterial({
  color: '#c5d1ee',
  emissive: glowHex.value,
  emissiveIntensity: 0.12,
  metalness: 0.62,
  roughness: 0.3,
})
const saucerBoltMatrix = new Matrix4()
const saucerBoltPosition = new Vector3()
const saucerBoltScale = new Vector3()
const saucerBoltQuaternion = new Quaternion()

function createSaucerHullPlateTransforms(): SaucerTransform[] {
  const plateCount = 6

  return Array.from({ length: plateCount }, (_, index) => {
    const angle = (index / plateCount) * Math.PI * 2
    const radius = 0.54

    return {
      key: `saucer-hull-plate-${index}`,
      position: [
        Math.cos(angle) * radius,
        0.1,
        Math.sin(angle) * radius,
      ],
      rotation: [0, -angle, 0],
      scale: [0.22, 0.045, 0.12],
    }
  })
}

function createSaucerWindowTransforms(): SaucerTransform[] {
  return [-0.34, -0.18, 0, 0.18, 0.34].map((zOffset, index) => ({
    key: `saucer-window-${index}`,
    position: [
      0.24 + (0.02 - Math.abs(zOffset) * 0.04),
      0.25,
      zOffset,
    ],
    scale: [
      zOffset === 0 ? 0.09 : 0.07,
      0.055,
      zOffset === 0 ? 0.11 : 0.09,
    ],
  }))
}

function createSaucerBoltTransforms(): SaucerTransform[] {
  const boltRows = [
    { key: 'upper', count: 20, radius: 0.88, yOffset: 0.08, phase: 0, size: 0.036 },
    { key: 'lower', count: 20, radius: 0.98, yOffset: 0.01, phase: Math.PI / 20, size: 0.036 },
  ]

  return boltRows.flatMap((row) => {
    return Array.from({ length: row.count }, (_, index) => {
      const angle = (index / row.count) * Math.PI * 2 + row.phase

      return {
        key: `saucer-bolt-${row.key}-${index}`,
        position: [
          Math.cos(angle) * row.radius,
          row.yOffset,
          Math.sin(angle) * row.radius,
        ],
        scale: [row.size, row.size, row.size],
      }
    })
  })
}

function createSaucerRimLightTransforms(): SaucerTransform[] {
  const lightCount = 12

  return Array.from({ length: lightCount }, (_, index) => {
    const angle = (index / lightCount) * Math.PI * 2
    const radius = index % 2 === 0 ? 1.04 : 1
    const size = index % 3 === 0 ? 0.078 : 0.062

    return {
      key: `saucer-rim-light-${index}`,
      position: [
        Math.cos(angle) * radius,
        -0.02,
        Math.sin(angle) * radius,
      ],
      scale: [size, 0.032, size],
    }
  })
}

function createSaucerUndersidePodTransforms(): SaucerTransform[] {
  const podCount = 3

  return Array.from({ length: podCount }, (_, index) => {
    const angle = (index / podCount) * Math.PI * 2 + Math.PI / 6
    const radius = 0.52

    return {
      key: `saucer-underside-pod-${index}`,
      position: [
        Math.cos(angle) * radius,
        -0.2,
        Math.sin(angle) * radius,
      ],
      rotation: [0, -angle, 0],
      scale: [0.11, 0.11, 0.18],
    }
  })
}

function resolveSaucerBoltMesh() {
  return saucerBoltMeshRef.value?.instance?.value ?? saucerBoltMeshRef.value?.instance ?? saucerBoltMeshRef.value
}

function updateSaucerBoltInstances() {
  const boltMesh = resolveSaucerBoltMesh() as InstancedMesh | null

  if (!boltMesh) {
    return
  }

  for (let index = 0; index < saucerBoltTransforms.length; index += 1) {
    const bolt = saucerBoltTransforms[index]!
    saucerBoltPosition.set(bolt.position[0], bolt.position[1], bolt.position[2])
    saucerBoltScale.set(bolt.scale[0], bolt.scale[1], bolt.scale[2])
    saucerBoltMatrix.compose(
      saucerBoltPosition,
      saucerBoltQuaternion,
      saucerBoltScale,
    )
    boltMesh.setMatrixAt(index, saucerBoltMatrix)
  }

  boltMesh.instanceMatrix.needsUpdate = true
  boltMesh.computeBoundingSphere()
}

watch(glowHex, (value) => {
  saucerBoltMaterial.emissive.set(value)
})

watch(() => props.isLowDetail, async (isLowDetail) => {
  if (isLowDetail) {
    return
  }

  await nextTick()
  updateSaucerBoltInstances()
}, {
  immediate: true,
})

onBeforeUnmount(() => {
  saucerBoltMaterial.dispose()
})
</script>

<template>
  <!-- Low-detail hull keeps the saucer's layered disc-and-dome profile in one mesh. -->
  <TresMesh
    v-if="props.isLowDetail"
    key="saucer-low"
    :geometry="saucerLowDetailGeometry"
    :scale="[props.selectedScale, props.selectedScale, props.selectedScale]"
  >
    <TresMeshBasicMaterial :color="colorHex" />
  </TresMesh>

  <!-- Shared saucer hull mesh used for the high-detail body shell. -->
  <TresMesh
    v-else
    key="saucer-high"
    :scale="bodyScale"
  >
    <TresCylinderGeometry :args="[0.82, 1.14, 0.28, 36]" />
    <TresMeshStandardMaterial
      :color="colorHex"
      :emissive="glowHex"
      :emissive-intensity="1.1"
      :metalness="0.48"
      :roughness="0.22"
    />
  </TresMesh>

  <!-- Cockpit, rim, and underside glow that sell the UFO silhouette in high detail. -->
  <TresGroup
    v-if="!props.isLowDetail"
    key="detail-saucer"
    :scale="[sceneBodyScale, sceneBodyScale, sceneBodyScale]"
  >
    <!-- Raised upper hull that makes the disc feel layered instead of flat. -->
    <TresMesh :position="[0, 0.08, 0]" :scale="[0.9, 0.12, 0.9]">
      <TresCylinderGeometry :args="[0.8, 0.98, 1, 36]" />
      <TresMeshStandardMaterial
        :color="trailHex"
        :emissive="glowHex"
        :emissive-intensity="0.38"
        :metalness="0.54"
        :roughness="0.24"
      />
    </TresMesh>
    <!-- Lower service lip that gives the underside a more engineered profile. -->
    <TresMesh :position="[0, -0.09, 0]" :scale="[1.04, 0.08, 1.04]">
      <TresCylinderGeometry :args="[0.9, 1.02, 1, 36]" />
      <TresMeshStandardMaterial
        :color="colorHex"
        :emissive="glowHex"
        :emissive-intensity="0.26"
        :metalness="0.5"
        :roughness="0.28"
      />
    </TresMesh>
    <!-- Upper dome for the pilot canopy. -->
    <TresMesh :position="[0, 0.2, 0]" :scale="[0.66, 0.3, 0.66]">
      <TresSphereGeometry :args="[1, 24, 24]" />
      <TresMeshStandardMaterial
        :color="trailHex"
        :emissive="glowHex"
        :emissive-intensity="0.7"
        :metalness="0.34"
        :roughness="0.24"
      />
    </TresMesh>
    <!-- Inner dome core that suggests a multi-layer canopy rather than a single bubble. -->
    <TresMesh :position="[0, 0.24, 0]" :scale="[0.4, 0.16, 0.4]">
      <TresSphereGeometry :args="[1, 20, 20]" />
      <TresMeshStandardMaterial
        color="#d9e7ff"
        :emissive="glowHex"
        :emissive-intensity="0.46"
        :opacity="0.84"
        transparent
        :metalness="0.18"
        :roughness="0.14"
      />
    </TresMesh>
    <!-- Canopy collar that visually locks the dome to the hull. -->
    <TresMesh :position="[0, 0.12, 0]" :rotation="[Math.PI / 2, 0, 0]" :scale="[0.66, 0.66, 0.66]">
      <TresTorusGeometry :args="[0.56, 0.05, 10, 48]" />
      <TresMeshStandardMaterial
        :color="colorHex"
        :emissive="glowHex"
        :emissive-intensity="0.34"
        :metalness="0.58"
        :roughness="0.24"
      />
    </TresMesh>
    <!-- Equatorial ring that sharpens the classic flying-saucer profile. -->
    <TresMesh :rotation="[Math.PI / 2, 0, 0]" :scale="[1.02, 1.02, 1.02]">
      <TresTorusGeometry :args="[1.04, 0.07, 10, 48]" />
      <TresMeshStandardMaterial
        :color="trailHex"
        :emissive="glowHex"
        :emissive-intensity="0.48"
        :metalness="0.46"
        :roughness="0.28"
      />
    </TresMesh>
    <!-- Narrow dorsal panel plates spaced around the top hull. -->
    <TresMesh
      v-for="plate in saucerHullPlateTransforms"
      :key="plate.key"
      :position="plate.position"
      :rotation="plate.rotation"
      :scale="plate.scale"
    >
      <TresBoxGeometry :args="[1, 1, 1]" />
      <TresMeshStandardMaterial
        :color="colorHex"
        :emissive="glowHex"
        :emissive-intensity="0.12"
        :metalness="0.5"
        :roughness="0.32"
      />
    </TresMesh>
    <!-- Evenly spaced bolt heads that wrap the hull in a more homogeneous pattern. -->
    <TresInstancedMesh
      ref="saucerBoltMeshRef"
      :args="[saucerBoltGeometry, saucerBoltMaterial, saucerBoltTransforms.length]"
    />
    <!-- Forward canopy windows that give the saucer a readable front side. -->
    <TresMesh
      v-for="windowItem in saucerWindowTransforms"
      :key="windowItem.key"
      :position="windowItem.position"
      :scale="windowItem.scale"
    >
      <TresSphereGeometry :args="[1, 16, 16]" />
      <TresMeshStandardMaterial
        color="#e4efff"
        :emissive="glowHex"
        :emissive-intensity="0.58"
        :opacity="0.86"
        transparent
        :metalness="0.12"
        :roughness="0.12"
      />
    </TresMesh>
    <!-- Perimeter running lights around the rim to break up the outer edge. -->
    <TresMesh
      v-for="rimLight in saucerRimLightTransforms"
      :key="rimLight.key"
      :position="rimLight.position"
      :scale="rimLight.scale"
    >
      <TresSphereGeometry :args="[1, 14, 14]" />
      <TresMeshStandardMaterial
        color="#dff5ff"
        :emissive="glowHex"
        :emissive-intensity="0.82"
        :metalness="0.08"
        :roughness="0.18"
      />
    </TresMesh>
    <!-- Underside service ring framing the central emitter. -->
    <TresMesh :position="[0, -0.16, 0]" :rotation="[Math.PI / 2, 0, 0]" :scale="[0.84, 0.84, 0.84]">
      <TresTorusGeometry :args="[0.52, 0.05, 10, 42]" />
      <TresMeshStandardMaterial
        :color="trailHex"
        :emissive="glowHex"
        :emissive-intensity="0.42"
        :metalness="0.38"
        :roughness="0.26"
      />
    </TresMesh>
    <!-- Secondary underside pods suggesting landing gear housings or beam projectors. -->
    <TresMesh
      v-for="pod in saucerUndersidePodTransforms"
      :key="pod.key"
      :position="pod.position"
      :rotation="pod.rotation"
      :scale="pod.scale"
    >
      <TresCylinderGeometry :args="[0.72, 0.52, 1, 16]" />
      <TresMeshStandardMaterial
        :color="trailHex"
        :emissive="glowHex"
        :emissive-intensity="0.34"
        :metalness="0.3"
        :roughness="0.32"
      />
    </TresMesh>
  </TresGroup>
</template>
