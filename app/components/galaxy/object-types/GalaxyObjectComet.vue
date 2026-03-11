<script setup lang="ts">
import type { Mesh } from 'three'
import type { GalaxyObjectVisualProps } from './shared'
import { useLoop } from '@tresjs/core'
import { Color, DoubleSide } from 'three'
import { COMET_TAIL_LENGTH, COMET_TAIL_SCALE } from './comet'
import { useGalaxyObjectVisualState } from './shared'
import {
  cometAccentGeometry,
  cometCoreGeometry,
  cometIceCapGeometry,
  cometInnerPlumeGeometry,
  cometLowDetailGeometry,
  cometOuterPlumeGeometry,
  cometParticleGeometry,
} from './shared-geometries'

const props = defineProps<GalaxyObjectVisualProps>()
const { scale: sceneBodyScale, colorHex, glowHex, trailHex } = useGalaxyObjectVisualState(props)

interface CometParticleTransform {
  key: string
  radius: number
  drift: number
  offset: number
  phase: number
  pulse: number
  size: number
  speed: number
  swirl: number
}

// Seeded particle transforms keep each user's comet stable between renders.
const cometParticles = createCometParticleTransforms(props.body.seed)
const trailGroupRef = shallowRef<any>(null)
const particleMeshRefs: Array<any | null> = []
const cometTailScale = computed(() => sceneBodyScale.value * COMET_TAIL_SCALE)
const icyAccentColor = computed(() => {
  return new Color(trailHex.value).lerp(new Color('#ffffff'), 0.35).getStyle()
})
const highDetailScale = computed<[number, number, number]>(() => {
  return [props.selectedScale, props.selectedScale, props.selectedScale]
})
const iceCapPosition = computed<[number, number, number]>(() => {
  const offset = props.selectedScale * 0.18
  return [offset, offset * 0.4, 0]
})
const { onBeforeRender } = useLoop()

function createSeededRandom(seed: number) {
  let state = (seed ^ 0x9E3779B9) >>> 0

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function createCometParticleTransforms(seed: number) {
  const random = createSeededRandom(seed * 29 + 73)

  return Array.from({ length: 14 }, (_, index) => ({
    key: `comet-particle-${index}`,
    radius: 0.1 + random() * 0.34,
    drift: 0.22 + random() * 0.34,
    offset: random() * (COMET_TAIL_LENGTH * 0.7),
    phase: random() * Math.PI * 2,
    pulse: 0.7 + random() * 1.4,
    size: 0.04 + random() * 0.08,
    speed: 0.45 + random() * 0.8,
    swirl: 0.7 + random() * 1.8,
  }))
}

function resolveTrailGroup() {
  return trailGroupRef.value?.instance?.value ?? trailGroupRef.value?.instance ?? trailGroupRef.value
}

function resolveParticleMesh(index: number) {
  const source = particleMeshRefs[index]
  return source?.instance?.value ?? source?.instance ?? source ?? null
}

function setParticleMeshRef(index: number, value: any) {
  particleMeshRefs[index] = value
}

function updateParticle(mesh: Mesh, particle: CometParticleTransform, elapsed: number) {
  const travel = (elapsed * particle.speed + particle.offset) % (COMET_TAIL_LENGTH * 0.92)
  const progress = travel / (COMET_TAIL_LENGTH * 0.92)
  const angle = elapsed * particle.swirl + particle.phase
  const taper = 1 - progress * 0.78
  const radius = particle.radius * taper
  const lift = 0.26 + travel
  const wobble = Math.sin(elapsed * (1.3 + particle.pulse) + particle.phase) * particle.drift * 0.06
  // Particles fade as they travel down the plume instead of staying uniformly bright.
  const fadeOut = (1 - progress) ** 2.4
  const flicker = 0.88 + Math.sin(elapsed * particle.pulse + particle.phase) * 0.12
  const opacity = Math.max(0, 0.52 * fadeOut * flicker)
  const scale = particle.size * (0.75 + taper * 1.35)
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material

  mesh.position.set(
    Math.cos(angle) * radius + wobble,
    lift,
    Math.sin(angle) * radius,
  )
  mesh.scale.setScalar(scale)

  if (material) {
    material.opacity = opacity
  }
}

// The galaxy wrapper uses this to aim the whole trail away from the system center.
defineExpose({
  getCometTrailGroup: resolveTrailGroup,
})

onBeforeRender(({ elapsed }) => {
  if (props.isLowDetail) {
    return
  }

  for (let index = 0; index < cometParticles.length; index += 1) {
    const mesh = resolveParticleMesh(index) as Mesh | null

    if (!mesh) {
      continue
    }

    updateParticle(mesh, cometParticles[index]!, elapsed)
  }
})
</script>

<template>
  <TresMesh
    v-if="props.isLowDetail"
    key="comet-low"
    :geometry="cometLowDetailGeometry"
    :scale="highDetailScale"
  >
    <TresMeshBasicMaterial :color="colorHex" />
  </TresMesh>

  <template v-else>
    <TresGroup key="comet-high">
      <!-- Smooth spherical nucleus for the comet body. -->
      <TresMesh :geometry="cometCoreGeometry" :scale="highDetailScale">
        <TresMeshStandardMaterial
          :color="colorHex"
          :emissive="glowHex"
          :emissive-intensity="0.6"
          :metalness="0.08"
          :roughness="0.88"
        />
      </TresMesh>

      <!-- Frosted cap to keep the nucleus from reading like a plain planet. -->
      <TresMesh
        :geometry="cometIceCapGeometry"
        :position="iceCapPosition"
        :scale="[props.selectedScale * 0.56, props.selectedScale * 0.38, props.selectedScale * 0.46]"
      >
        <TresMeshStandardMaterial
          color="#f3fbff"
          :emissive="glowHex"
          :emissive-intensity="0.42"
          :metalness="0.02"
          :roughness="0.24"
          transparent
          :opacity="0.92"
        />
      </TresMesh>

      <!-- Small accent pocket that breaks up the otherwise perfect sphere. -->
      <TresMesh
        :geometry="cometAccentGeometry"
        :position="[-props.selectedScale * 0.22, -props.selectedScale * 0.08, props.selectedScale * 0.12]"
        :scale="[props.selectedScale * 0.2, props.selectedScale * 0.12, props.selectedScale * 0.16]"
      >
        <TresMeshStandardMaterial
          :color="icyAccentColor"
          :emissive="glowHex"
          :emissive-intensity="0.28"
          :metalness="0.04"
          :roughness="0.3"
        />
      </TresMesh>

      <TresGroup
        ref="trailGroupRef"
        :scale="[cometTailScale, cometTailScale, cometTailScale]"
        :render-order="1"
      >
        <!-- Broad outer plume that defines the main comet silhouette. -->
        <TresMesh :geometry="cometOuterPlumeGeometry" :position="[0, COMET_TAIL_LENGTH * 0.48, 0]">
          <TresMeshStandardMaterial
            :color="trailHex"
            :emissive="glowHex"
            :emissive-intensity="0.9"
            :opacity="0.1"
            transparent
            :side="DoubleSide"
            :depth-write="false"
          />
        </TresMesh>

        <!-- Brighter inner cone that gives the trail a hotter core. -->
        <TresMesh :geometry="cometInnerPlumeGeometry" :position="[0, COMET_TAIL_LENGTH * 0.26, 0]" :scale="[0.5, 0.72, 0.5]">
          <TresMeshStandardMaterial
            :color="glowHex"
            :emissive="glowHex"
            :emissive-intensity="1.2"
            :opacity="0.16"
            transparent
            :side="DoubleSide"
            :depth-write="false"
          />
        </TresMesh>

        <!-- Animated debris sprites drifting through the plume. -->
        <TresMesh
          v-for="(particle, index) in cometParticles"
          :key="particle.key"
          :ref="(value) => setParticleMeshRef(index, value)"
          :geometry="cometParticleGeometry"
          :scale="[particle.size, particle.size, particle.size]"
        >
          <TresMeshStandardMaterial
            :color="trailHex"
            :emissive="glowHex"
            :emissive-intensity="1.1"
            transparent
            :opacity="0.22"
            :depth-write="false"
          />
        </TresMesh>
      </TresGroup>
    </TresGroup>
  </template>
</template>
