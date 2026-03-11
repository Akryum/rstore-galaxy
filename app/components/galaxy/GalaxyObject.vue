<script setup lang="ts">
import type { GalaxySceneBody } from '~~/shared/galaxy'
import { useLoop } from '@tresjs/core'
import { Quaternion, Vector3 } from 'three'
import { getSceneBodyOrbitAngle, getSceneBodyPosition, getSceneBodyScale, getSceneBodyTilt, getSceneBodyWobble } from '~~/shared/galaxy'
import { COMET_TAIL_OFFSET } from './object-types/comet'
import GalaxyObjectAsteroid from './object-types/GalaxyObjectAsteroid.vue'
import GalaxyObjectComet from './object-types/GalaxyObjectComet.vue'
import GalaxyObjectFallback from './object-types/GalaxyObjectFallback.vue'
import GalaxyObjectPlanet from './object-types/GalaxyObjectPlanet.vue'
import GalaxyObjectSaucer from './object-types/GalaxyObjectSaucer.vue'
import GalaxyObjectSpaceship from './object-types/GalaxyObjectSpaceship.vue'
import GalaxyObjectSpacewhale from './object-types/GalaxyObjectSpacewhale.vue'
import GalaxyObjectStation from './object-types/GalaxyObjectStation.vue'

const props = defineProps<{
  body: GalaxySceneBody
  entering: boolean
  fullDetail: boolean
  selected: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const TRAJECTORY_ALIGNMENT_LOOKAHEAD = 0.12
const FADE_IN_DURATION = 0.65

const groupRef = shallowRef<any>(null)
const bodyGroupRef = shallowRef<any>(null)
const objectComponentRef = shallowRef<any>(null)
const isLowDetail = computed(() => !props.fullDetail)
const fadeProgress = ref(props.entering ? 0 : 1)
const { onBeforeRender } = useLoop()

const bodyScale = computed(() => getSceneBodyScale(props.body))
const bodyTilt = computed(() => getSceneBodyTilt(props.body))
const hitRadius = computed(() => Number((Math.max(bodyScale.value * 1.7, 1.2)).toFixed(2)))
const selectedScale = computed(() => props.selected ? bodyScale.value * 1.08 : bodyScale.value)
const objectComponent = computed(() => {
  switch (props.body.bodyType) {
    case 'planet':
      return GalaxyObjectPlanet
    case 'asteroid':
      return GalaxyObjectAsteroid
    case 'comet':
      return GalaxyObjectComet
    case 'station':
      return GalaxyObjectStation
    case 'spaceship':
      return GalaxyObjectSpaceship
    case 'saucer':
      return GalaxyObjectSaucer
    case 'spacewhale':
      return GalaxyObjectSpacewhale
    default:
      return GalaxyObjectFallback
  }
})

const cometTailDirection = new Vector3()
const cometTailQuaternion = new Quaternion()
const cometTailAxis = new Vector3(0, 1, 0)
const cometTailLocalDirection = new Vector3()
const bodyGroupInverseQuaternion = new Quaternion()
const currentPosition = new Vector3()
const trajectoryDirection = new Vector3()
const trajectoryForwardAxis = new Vector3(1, 0, 0)

let fadeStartElapsed: number | null = props.entering ? null : 0

function resolveGroup() {
  return groupRef.value?.instance?.value ?? groupRef.value?.instance ?? groupRef.value
}

function resolveBodyGroup() {
  return bodyGroupRef.value?.instance?.value ?? bodyGroupRef.value?.instance ?? bodyGroupRef.value
}

function resolveCometTrail() {
  return objectComponentRef.value?.getCometTrailGroup?.() ?? null
}

function syncFade(progress: number) {
  const group = resolveGroup()

  if (!group) {
    return
  }

  group.traverse((object: any) => {
    const sourceMaterials = object.material
      ? Array.isArray(object.material)
        ? object.material
        : [object.material]
      : []

    for (const material of sourceMaterials) {
      const baseOpacity = material.userData.__galaxyBaseOpacity ?? material.opacity ?? 1
      const baseTransparent = material.userData.__galaxyBaseTransparent ?? material.transparent ?? false
      const baseDepthWrite = material.userData.__galaxyBaseDepthWrite ?? material.depthWrite ?? true
      const nextOpacity = baseOpacity * progress
      const nextTransparent = progress < 1 || baseTransparent || baseOpacity < 1
      const nextDepthWrite = progress < 1 ? false : baseDepthWrite

      material.userData.__galaxyBaseOpacity = baseOpacity
      material.userData.__galaxyBaseTransparent = baseTransparent
      material.userData.__galaxyBaseDepthWrite = baseDepthWrite

      if (material.opacity !== nextOpacity) {
        material.opacity = nextOpacity
      }

      if (material.transparent !== nextTransparent) {
        material.transparent = nextTransparent
        material.needsUpdate = true
      }

      if (material.depthWrite !== nextDepthWrite) {
        material.depthWrite = nextDepthWrite
      }
    }
  })
}

function handleSelect() {
  if (props.body.interactive === false) {
    return
  }

  emit('select', props.body.id)
}

onMounted(async () => {
  if (!props.entering) {
    return
  }

  await nextTick()
  syncFade(0)
})

onBeforeRender(({ elapsed }) => {
  const group = resolveGroup()
  const bodyGroup = resolveBodyGroup()
  const cometTrail = props.body.bodyType === 'comet' ? resolveCometTrail() : null

  if (!group || !bodyGroup) {
    return
  }

  if (fadeProgress.value < 1) {
    if (fadeStartElapsed === null) {
      fadeStartElapsed = elapsed
    }

    const nextFadeProgress = Math.min(1, (elapsed - fadeStartElapsed) / FADE_IN_DURATION)

    if (nextFadeProgress !== fadeProgress.value) {
      fadeProgress.value = nextFadeProgress
      syncFade(nextFadeProgress)
    }
  }

  const orbitAngle = getSceneBodyOrbitAngle(props.body, elapsed)
  const wobble = getSceneBodyWobble(props.body, elapsed)
  const [x, y, z] = getSceneBodyPosition(props.body, elapsed)
  currentPosition.set(x, y, z)

  group.position.copy(currentPosition)

  if (props.body.bodyType === 'comet' && isLowDetail.value) {
    cometTailDirection.set(x, y, z)

    if (cometTailDirection.lengthSq() > 0.0001) {
      cometTailDirection.normalize()
      bodyGroup.quaternion.setFromUnitVectors(cometTailAxis, cometTailDirection)
      bodyGroup.rotateY(orbitAngle + bodyTilt.value + wobble)
    }
    else {
      bodyGroup.rotation.set(bodyTilt.value, orbitAngle, wobble)
    }
  }
  else if (props.body.bodyType === 'spaceship' || props.body.bodyType === 'spacewhale') {
    const [nextX, nextY, nextZ] = getSceneBodyPosition(props.body, elapsed + TRAJECTORY_ALIGNMENT_LOOKAHEAD)
    trajectoryDirection.set(nextX - x, nextY - y, nextZ - z)

    if (trajectoryDirection.lengthSq() > 0.0001) {
      trajectoryDirection.normalize()
      bodyGroup.quaternion.setFromUnitVectors(trajectoryForwardAxis, trajectoryDirection)
      bodyGroup.rotateX(bodyTilt.value)
      bodyGroup.rotateZ(wobble)
    }
    else {
      bodyGroup.rotation.set(bodyTilt.value, orbitAngle, wobble)
    }
  }
  else {
    bodyGroup.rotation.set(bodyTilt.value, orbitAngle, wobble)
  }

  if (cometTrail) {
    cometTailDirection.set(x, y, z)

    if (cometTailDirection.lengthSq() < 0.0001) {
      cometTailDirection.set(1, 0, 0)
    }
    else {
      cometTailDirection.normalize()
    }

    bodyGroupInverseQuaternion.copy(bodyGroup.quaternion).invert()
    cometTailLocalDirection.copy(cometTailDirection).applyQuaternion(bodyGroupInverseQuaternion)
    cometTrail.position.copy(cometTailLocalDirection).multiplyScalar(bodyScale.value * COMET_TAIL_OFFSET)
    cometTailQuaternion.setFromUnitVectors(cometTailAxis, cometTailLocalDirection)
    cometTrail.quaternion.copy(cometTailQuaternion)
  }
})
</script>

<template>
  <TresGroup
    ref="groupRef"
    :visible="fadeProgress > 0"
  >
    <TresGroup ref="bodyGroupRef">
      <component
        :is="objectComponent"
        ref="objectComponentRef"
        :body="props.body"
        :is-low-detail="isLowDetail"
        :selected-scale="selectedScale"
      />
    </TresGroup>

    <TresMesh name="clickarea" @click.stop="handleSelect">
      <TresSphereGeometry :args="[hitRadius, 10, 10]" />
      <TresMeshBasicMaterial
        :opacity="0"
        :color-write="false"
        :depth-test="false"
        :depth-write="false"
        transparent
      />
    </TresMesh>
  </TresGroup>
</template>
