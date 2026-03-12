<script setup lang="ts">
import type { GalaxySceneBody } from '~~/shared/galaxy'
import type { SceneProfileItem } from '~/types/galaxy'
import { OrbitControls } from '@tresjs/cientos'
import { useLoop, useTres } from '@tresjs/core'
import { Euler, Frustum, Matrix4, Quaternion, Sphere, Vector3 } from 'three'
import {
  getSceneBodyDisplayOrbitDistance,
  getSceneBodyGlowHex,
  getSceneBodyOrbitRotation,
  getSceneBodyPosition,
  getSceneBodyScale,
} from '~~/shared/galaxy'

const props = defineProps<{
  items: SceneProfileItem[]
  selectedId: string | null
  recenterSelectionEnabled: boolean
  performanceMode: boolean
  ultraPerformanceMode: boolean
}>()

const emit = defineEmits<{
  select: [id: string | null]
}>()

const controlsRef = shallowRef<any>(null)
const { camera, invalidate } = useTres()
const { onBeforeRender } = useLoop()

const DEFAULT_MIN_DISTANCE = 18
const DEFAULT_MAX_DISTANCE = 180
const SELECTED_MIN_DISTANCE_MULTIPLIER = 6.5
const SELECTED_MAX_DISTANCE_MULTIPLIER = 20
const SELECTED_DISTANCE_MULTIPLIER = 12
const SELECTED_MIN_DISTANCE_FLOOR = 8
const SELECTED_MAX_DISTANCE_FLOOR = 26
const SELECTED_DISTANCE_FLOOR = 18
const SELECTED_TRANSITION_STEP = 0.08
const DEFAULT_TRANSITION_STEP = 0.06
const RECENTER_SELECTION_INTERVAL_MS = 1000
const BODY_FADE_IN_DURATION = 0.65
const MAX_HIGH_DETAIL_BODY_LIMIT = 40
const DETAILED_BODY_LIMIT = 96
const PERFORMANCE_DETAILED_BODY_LIMIT = 40
const ULTRA_DETAILED_BODY_LIMIT = 18
const MAX_NEARBY_DETAILED_BODY_LIMIT = 224
const PERFORMANCE_MAX_NEARBY_DETAILED_BODY_LIMIT = 112
const ULTRA_MAX_NEARBY_DETAILED_BODY_LIMIT = 48
const NEARBY_DETAILED_DISTANCE = 232
const PERFORMANCE_NEARBY_DETAILED_DISTANCE = 216
const ULTRA_NEARBY_DETAILED_DISTANCE = 200
const DETAILED_DISTANCE_BOUND_LEEWAY = 1
const FULL_DETAIL_VIEWPORT_RADIUS_MULTIPLIER = 2.25
const FULL_DETAIL_VIEWPORT_RADIUS_FLOOR = 1.2
const INSTANCE_CAPACITY_FLOOR = 1024

const defaultCameraDirection = new Vector3(0, 42, 104)
const defaultCameraPosition = defaultCameraDirection.clone().setLength(DEFAULT_MAX_DISTANCE)
const starCameraPosition = defaultCameraPosition.toArray() as [number, number, number]
const starTarget = new Vector3(0, 0, 0)
const desiredTarget = new Vector3()
const focusTarget = new Vector3()
const cameraOffset = new Vector3()
const targetDelta = new Vector3()
const previousSelectedTarget = new Vector3()
const transitionStartPosition = new Vector3()
const transitionEndPosition = new Vector3()
const transitionStartTarget = new Vector3()
const transitionEndTarget = new Vector3()
const fullDetailFrustum = new Frustum()
const fullDetailProjectionMatrix = new Matrix4()
const fullDetailViewportSphere = new Sphere()
const fullDetailViewportCenter = new Vector3()
// Bodies start in cheap instanced rendering, then graduate to full components
// when they are selected or close enough to deserve more detail.
const sceneBodies = computed<GalaxySceneBody[]>(() => getOrderedSceneItems(props.items))
const selectedBody = computed(() => {
  if (!props.selectedId) {
    return null
  }

  return sceneBodies.value.find(body => body.id === props.selectedId) ?? null
})
const orbitRingEuler = new Euler(0, 0, 0, 'ZYX')
const orbitRingQuaternion = computed(() => {
  if (!selectedBody.value) {
    return new Quaternion()
  }

  orbitRingEuler.set(...getSceneBodyOrbitRotation(selectedBody.value), 'ZYX')
  return new Quaternion().setFromEuler(orbitRingEuler)
})

const elapsed = ref(0)
const isUserInteracting = ref(false)
const transitionProgress = ref(1)
const selectedBodyPosition = new Vector3()
const enteringBodyIds = shallowRef(new Set<string>())
const componentBodyIds = shallowRef(new Set<string>())
const fullDetailBodyIds = shallowRef(new Set<string>())
const enteringBodyStartedAt = new Map<string, number>()
const hasPreviousSelectedTarget = ref(false)
const hasInitializedSceneBodies = ref(false)
const componentBodyLimit = computed(() => {
  const limit = props.ultraPerformanceMode
    ? ULTRA_DETAILED_BODY_LIMIT
    : props.performanceMode ? PERFORMANCE_DETAILED_BODY_LIMIT : DETAILED_BODY_LIMIT

  return Math.min(MAX_HIGH_DETAIL_BODY_LIMIT, limit)
})
const fullDetailBodyLimit = computed(() => {
  const limit = props.ultraPerformanceMode
    ? ULTRA_MAX_NEARBY_DETAILED_BODY_LIMIT
    : props.performanceMode ? PERFORMANCE_MAX_NEARBY_DETAILED_BODY_LIMIT : MAX_NEARBY_DETAILED_BODY_LIMIT

  return Math.min(componentBodyLimit.value, MAX_HIGH_DETAIL_BODY_LIMIT, limit)
})
const fullDetailDistance = computed(() => {
  if (props.ultraPerformanceMode) {
    return ULTRA_NEARBY_DETAILED_DISTANCE
  }

  return props.performanceMode ? PERFORMANCE_NEARBY_DETAILED_DISTANCE : NEARBY_DETAILED_DISTANCE
})
const lodRefreshFrameInterval = computed(() => {
  if (props.ultraPerformanceMode) {
    return 12
  }

  return props.performanceMode ? 8 : 6
})
const instancedBodyCapacity = computed(() => {
  return Math.max(INSTANCE_CAPACITY_FLOOR, sceneBodies.value.length)
})
const sceneBodyBuckets = computed(() => {
  const componentBodies: GalaxySceneBody[] = []
  const instanced: GalaxySceneBody[] = []

  for (const body of sceneBodies.value) {
    if (componentBodyIds.value.has(body.id)) {
      componentBodies.push(body)
    }
    else {
      instanced.push(body)
    }
  }

  return {
    componentBodies,
    instanced,
  }
})
const componentBodies = computed(() => sceneBodyBuckets.value.componentBodies)
const instancedBodies = computed(() => sceneBodyBuckets.value.instanced)
let recenterSelectionIntervalId: number | null = null
let lodRefreshFrame = 0
const rankedComponentCandidates: Array<{ id: string, distanceSq: number }> = []
const rankedFullDetailCandidates: Array<{ id: string, distanceSq: number }> = []

function getOrderedSceneItems(items: SceneProfileItem[]) {
  return [...items].toSorted((left, right) => {
    const leftOrbitDistance = Number(left.orbitDistance)
    const rightOrbitDistance = Number(right.orbitDistance)

    if (leftOrbitDistance !== rightOrbitDistance) {
      return leftOrbitDistance - rightOrbitDistance
    }

    return String(left.id).localeCompare(String(right.id))
  })
}

function areSetsEqual(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) {
    return false
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false
    }
  }

  return true
}

function insertRankedCandidate(
  candidates: Array<{ id: string, distanceSq: number }>,
  id: string,
  distanceSq: number,
  limit: number,
) {
  let insertIndex = candidates.length

  while (insertIndex > 0 && candidates[insertIndex - 1]!.distanceSq > distanceSq) {
    insertIndex -= 1
  }

  candidates.splice(insertIndex, 0, { id, distanceSq })

  if (candidates.length > limit) {
    candidates.length = limit
  }
}

function getCameraRadius() {
  const activeCamera = camera.value

  if (!activeCamera) {
    return null
  }

  return activeCamera.position.length()
}

function getBodyDistanceLowerBoundSq(body: GalaxySceneBody, cameraRadius: number) {
  const radialDelta = Math.max(
    0,
    Math.abs(getSceneBodyDisplayOrbitDistance(body) - cameraRadius) - DETAILED_DISTANCE_BOUND_LEEWAY,
  )

  return radialDelta ** 2
}

function syncFullDetailFrustum(activeCamera: NonNullable<typeof camera.value>) {
  fullDetailProjectionMatrix.multiplyMatrices(activeCamera.projectionMatrix, activeCamera.matrixWorldInverse)
  fullDetailFrustum.setFromProjectionMatrix(fullDetailProjectionMatrix)
}

function isBodyVisibleInViewport(body: GalaxySceneBody, x: number, y: number, z: number) {
  fullDetailViewportCenter.set(x, y, z)
  fullDetailViewportSphere.center.copy(fullDetailViewportCenter)
  fullDetailViewportSphere.radius = Math.max(
    FULL_DETAIL_VIEWPORT_RADIUS_FLOOR,
    getSceneBodyScale(body) * FULL_DETAIL_VIEWPORT_RADIUS_MULTIPLIER,
  )

  return fullDetailFrustum.intersectsSphere(fullDetailViewportSphere)
}

function appendNearbyFullDetailBodies(
  componentIds: Set<string>,
  fullDetailIds: Set<string>,
  limit: number,
  frameElapsed: number,
) {
  if (limit <= 0) {
    return
  }

  const activeCamera = camera.value
  const cameraRadius = getCameraRadius()

  if (!activeCamera || cameraRadius == null) {
    return
  }

  const closeDistanceSq = fullDetailDistance.value ** 2
  syncFullDetailFrustum(activeCamera)
  rankedFullDetailCandidates.length = 0

  for (const body of sceneBodies.value) {
    if (componentIds.has(body.id) || getBodyDistanceLowerBoundSq(body, cameraRadius) > closeDistanceSq) {
      continue
    }

    const [x, y, z] = getSceneBodyPosition(body, frameElapsed)
    const distanceSq = (
      (activeCamera.position.x - x) ** 2
      + (activeCamera.position.y - y) ** 2
      + (activeCamera.position.z - z) ** 2
    )

    if (distanceSq > closeDistanceSq) {
      continue
    }

    if (!isBodyVisibleInViewport(body, x, y, z)) {
      continue
    }

    if (
      rankedFullDetailCandidates.length < limit
      || distanceSq < rankedFullDetailCandidates.at(-1)!.distanceSq
    ) {
      insertRankedCandidate(rankedFullDetailCandidates, body.id, distanceSq, limit)
    }
  }

  for (const candidate of rankedFullDetailCandidates) {
    componentIds.add(candidate.id)
    fullDetailIds.add(candidate.id)
  }
}

function appendClosestComponentBodies(componentIds: Set<string>, limit: number, frameElapsed: number) {
  if (limit <= 0) {
    return
  }

  const activeCamera = camera.value
  const cameraRadius = getCameraRadius()
  rankedComponentCandidates.length = 0

  for (const body of sceneBodies.value) {
    if (componentIds.has(body.id)) {
      continue
    }

    if (
      cameraRadius != null
      && rankedComponentCandidates.length >= limit
      && getBodyDistanceLowerBoundSq(body, cameraRadius) >= rankedComponentCandidates.at(-1)!.distanceSq
    ) {
      continue
    }

    const [x, y, z] = getSceneBodyPosition(body, frameElapsed)
    const distanceSq = activeCamera
      ? (
          (activeCamera.position.x - x) ** 2
          + (activeCamera.position.y - y) ** 2
          + (activeCamera.position.z - z) ** 2
        )
      : getSceneBodyDisplayOrbitDistance(body) ** 2

    if (rankedComponentCandidates.length < limit || distanceSq < rankedComponentCandidates.at(-1)!.distanceSq) {
      insertRankedCandidate(rankedComponentCandidates, body.id, distanceSq, limit)
    }
  }

  for (const candidate of rankedComponentCandidates) {
    componentIds.add(candidate.id)
  }
}

function appendPriorityComponentBodies(componentIds: Set<string>, fullDetailIds: Set<string>) {
  if (selectedBody.value) {
    componentIds.add(selectedBody.value.id)
    fullDetailIds.add(selectedBody.value.id)
  }
}

function syncBodyLod(frameElapsed = elapsed.value) {
  const nextComponentIds = new Set<string>()
  const nextFullDetailIds = new Set<string>()
  const componentLimit = componentBodyLimit.value
  const fullDetailLimit = Math.min(componentLimit, fullDetailBodyLimit.value)

  appendPriorityComponentBodies(nextComponentIds, nextFullDetailIds)

  const fullDetailSlots = Math.max(0, fullDetailLimit - nextComponentIds.size)

  if (fullDetailSlots > 0) {
    appendNearbyFullDetailBodies(nextComponentIds, nextFullDetailIds, fullDetailSlots, frameElapsed)
  }

  const remainingSlots = Math.max(0, componentLimit - nextComponentIds.size)

  if (remainingSlots > 0) {
    appendClosestComponentBodies(nextComponentIds, remainingSlots, frameElapsed)
  }

  if (!areSetsEqual(nextComponentIds, componentBodyIds.value)) {
    componentBodyIds.value = nextComponentIds
  }

  if (!areSetsEqual(nextFullDetailIds, fullDetailBodyIds.value)) {
    fullDetailBodyIds.value = nextFullDetailIds
  }
}

function syncEnteringBodies(frameElapsed = elapsed.value) {
  const nextEnteringIds = new Set<string>()

  for (const id of enteringBodyIds.value) {
    const startElapsed = enteringBodyStartedAt.get(id)

    if (startElapsed == null) {
      continue
    }

    if ((frameElapsed - startElapsed) < BODY_FADE_IN_DURATION) {
      nextEnteringIds.add(id)
    }
    else {
      enteringBodyStartedAt.delete(id)
    }
  }

  if (!areSetsEqual(nextEnteringIds, enteringBodyIds.value)) {
    enteringBodyIds.value = nextEnteringIds
  }
}

// Fade in newly appeared profiles so realtime arrivals feel intentional instead of abrupt.
watch(sceneBodies, (nextBodies, previousBodies) => {
  const previousIds = new Set((previousBodies ?? []).map(body => body.id))
  const nextIds = new Set(nextBodies.map(body => body.id))
  const nextEnteringIds = new Set<string>()

  for (const id of enteringBodyIds.value) {
    if (nextIds.has(id)) {
      nextEnteringIds.add(id)
    }
    else {
      enteringBodyStartedAt.delete(id)
    }
  }

  if (hasInitializedSceneBodies.value) {
    for (const body of nextBodies) {
      if (!previousIds.has(body.id)) {
        enteringBodyStartedAt.set(body.id, elapsed.value)
        nextEnteringIds.add(body.id)
      }
    }
  }

  for (const id of enteringBodyStartedAt.keys()) {
    if (!nextIds.has(id)) {
      enteringBodyStartedAt.delete(id)
    }
  }

  if (!areSetsEqual(nextEnteringIds, enteringBodyIds.value)) {
    enteringBodyIds.value = nextEnteringIds
  }

  hasInitializedSceneBodies.value = true
  syncEnteringBodies()
  syncBodyLod()
}, {
  immediate: true,
})

watch(() => props.selectedId, () => {
  hasPreviousSelectedTarget.value = false
  startCameraTransition(selectedBody.value)
})

function resolveControls() {
  return controlsRef.value?.instance?.value ?? controlsRef.value?.instance ?? controlsRef.value
}

function getDesiredDistance(body: GalaxySceneBody | null) {
  return body
    ? Math.max(SELECTED_DISTANCE_FLOOR, getSceneBodyScale(body) * SELECTED_DISTANCE_MULTIPLIER)
    : DEFAULT_MAX_DISTANCE
}

function updateSelectedBodyPosition(body: GalaxySceneBody | null, frameElapsed: number) {
  if (!body) {
    selectedBodyPosition.copy(starTarget)
    return selectedBodyPosition
  }

  const [x, y, z] = getSceneBodyPosition(body, frameElapsed)
  selectedBodyPosition.set(x, y, z)
  return selectedBodyPosition
}

function startCameraTransition(body: GalaxySceneBody | null) {
  const controls = resolveControls()
  const activeCamera = camera.value

  if (!controls || !activeCamera) {
    return
  }

  transitionStartPosition.copy(activeCamera.position)
  transitionStartTarget.copy(controls.target)
  transitionEndTarget.copy(updateSelectedBodyPosition(body, elapsed.value))

  cameraOffset.copy(activeCamera.position).sub(controls.target)

  if (cameraOffset.lengthSq() < 0.001) {
    cameraOffset.copy(defaultCameraPosition)
  }

  cameraOffset.setLength(getDesiredDistance(body))
  transitionEndPosition.copy(transitionEndTarget).add(cameraOffset)
  transitionProgress.value = 0
}

function handleControlsStart() {
  isUserInteracting.value = true
  transitionProgress.value = 1
}

function handleControlsEnd() {
  isUserInteracting.value = false
  transitionProgress.value = 1
}

function stopRecenterSelectionInterval() {
  if (recenterSelectionIntervalId !== null) {
    window.clearInterval(recenterSelectionIntervalId)
    recenterSelectionIntervalId = null
  }
}

function syncRecenterSelectionInterval() {
  stopRecenterSelectionInterval()

  if (!import.meta.client || !props.recenterSelectionEnabled || !selectedBody.value) {
    return
  }

  recenterSelectionIntervalId = window.setInterval(() => {
    if (!props.recenterSelectionEnabled || !selectedBody.value) {
      stopRecenterSelectionInterval()
      return
    }

    startCameraTransition(selectedBody.value)
  }, RECENTER_SELECTION_INTERVAL_MS)
}

watch(() => props.recenterSelectionEnabled, () => {
  syncRecenterSelectionInterval()
})

watch(selectedBody, () => {
  syncRecenterSelectionInterval()
  syncBodyLod()
})

watch(() => [props.performanceMode, props.ultraPerformanceMode], () => {
  syncBodyLod()
})

onMounted(() => {
  syncRecenterSelectionInterval()
})

// Each frame keeps the selected body centered while periodically recalculating
// which bodies deserve full-detail component rendering.
onBeforeRender(({ elapsed: frameElapsed }) => {
  elapsed.value = frameElapsed
  syncEnteringBodies(frameElapsed)

  const controls = resolveControls()
  const activeCamera = camera.value

  if (!controls || !activeCamera) {
    return
  }

  if (selectedBody.value) {
    desiredTarget.copy(updateSelectedBodyPosition(selectedBody.value, frameElapsed))

    if (!hasPreviousSelectedTarget.value) {
      previousSelectedTarget.copy(desiredTarget)
      hasPreviousSelectedTarget.value = true
    }
  }
  else {
    desiredTarget.copy(starTarget)
    hasPreviousSelectedTarget.value = false
  }

  const minDistance = selectedBody.value
    ? Math.max(SELECTED_MIN_DISTANCE_FLOOR, getSceneBodyScale(selectedBody.value) * SELECTED_MIN_DISTANCE_MULTIPLIER)
    : DEFAULT_MIN_DISTANCE
  const maxDistance = selectedBody.value
    ? Math.max(SELECTED_MAX_DISTANCE_FLOOR, getSceneBodyScale(selectedBody.value) * SELECTED_MAX_DISTANCE_MULTIPLIER)
    : DEFAULT_MAX_DISTANCE

  controls.minDistance = minDistance
  controls.maxDistance = maxDistance

  if (transitionProgress.value < 1 && !isUserInteracting.value) {
    transitionProgress.value = Math.min(1, transitionProgress.value + (selectedBody.value ? SELECTED_TRANSITION_STEP : DEFAULT_TRANSITION_STEP))
    const easedProgress = 1 - ((1 - transitionProgress.value) ** 3)

    transitionEndTarget.copy(desiredTarget)
    transitionEndPosition.copy(transitionEndTarget).add(cameraOffset)
    focusTarget.lerpVectors(transitionStartTarget, transitionEndTarget, easedProgress)
    activeCamera.position.lerpVectors(transitionStartPosition, transitionEndPosition, easedProgress)
    controls.target.copy(focusTarget)
  }
  else if (selectedBody.value) {
    // Move the camera rig by the body's orbital delta so focus stays centered without resetting rotation.
    targetDelta.subVectors(desiredTarget, previousSelectedTarget)

    if (targetDelta.lengthSq() > 0) {
      activeCamera.position.add(targetDelta)
      controls.target.add(targetDelta)
    }
  }
  else if (!selectedBody.value) {
    controls.target.copy(starTarget)
  }

  if (selectedBody.value) {
    previousSelectedTarget.copy(desiredTarget)
  }

  controls.update()
  invalidate()

  lodRefreshFrame = (lodRefreshFrame + 1) % lodRefreshFrameInterval.value

  if (lodRefreshFrame === 0) {
    syncBodyLod(frameElapsed)
  }
})

onBeforeUnmount(() => {
  stopRecenterSelectionInterval()
})
</script>

<template>
  <!-- Main perspective camera that frames the whole galaxy scene. -->
  <TresPerspectiveCamera
    :position="starCameraPosition"
    :fov="45"
    :near="0.1"
    :far="420"
    make-default
  />

  <!-- Mouse/touch orbit controls, retargeted toward the selected body in the render loop. -->
  <OrbitControls
    ref="controlsRef"
    :enable-pan="false"
    :enable-rotate="true"
    :enable-damping="true"
    :auto-rotate="!selectedBody"
    :auto-rotate-speed="0.03"
    :damping-factor="0.06"
    :min-distance="18"
    :max-distance="180"
    :max-polar-angle="Math.PI / 1.85"
    @start="handleControlsStart"
    @end="handleControlsEnd"
  />

  <!-- Soft fill light that keeps the dark side of bodies readable. -->
  <TresAmbientLight color="#6bb8ff" :intensity="0.55" />
  <!-- Directional light that adds the strongest highlights and shadow definition. -->
  <TresDirectionalLight :position="[30, 42, 12]" color="#6ee7ff" :intensity="2.3" :cast-shadow="!props.performanceMode" />
  <!-- Intense point light at the center that makes the star feel emissive. -->
  <TresPointLight :position="[0, 0, 0]" color="#ffd27a" :distance="200" :intensity="120" />

  <!-- Oversized inverted sphere that acts as a hidden scene shell around the galaxy. -->

  <!-- Solid inner star at the center of the solar system. -->
  <TresMesh>
    <!-- Dense sphere for the visible star core. -->
    <TresSphereGeometry :args="[5.4, 48, 48]" />
    <!-- Bright emissive material that makes the star glow. -->
    <TresMeshStandardMaterial color="#ffd27a" emissive="#ff9a38" :emissive-intensity="1.7" />
  </TresMesh>

  <!-- Larger translucent sphere that creates a soft halo around the core star. -->
  <TresMesh>
    <!-- Slightly bigger sphere used only for the glow volume. -->
    <TresSphereGeometry :args="[6.8, 48, 48]" />
    <!-- Transparent material for the star's outer bloom. -->
    <TresMeshBasicMaterial color="#ffb56a" transparent :opacity="0.18" />
  </TresMesh>

  <!-- Highlight ring that marks the currently selected body's orbit. -->
  <TresGroup v-if="selectedBody">
    <TresGroup
      :key="`ring-${selectedBody.id}`"
      :quaternion="orbitRingQuaternion"
    >
      <TresMesh :rotation="[Math.PI / 2, 0, 0]">
        <!-- Torus sized to the selected body's orbit radius. -->
        <TresTorusGeometry :args="[getSceneBodyDisplayOrbitDistance(selectedBody), 0.045, 6, props.performanceMode ? 96 : 160]" />
        <!-- Bright semi-transparent material that keeps the orbit guide visible. -->
        <TresMeshStandardMaterial
          :color="getSceneBodyGlowHex(selectedBody)"
          :emissive="getSceneBodyGlowHex(selectedBody)"
          :emissive-intensity="0.6"
          :transparent="true"
          :opacity="0.3"
        />
      </TresMesh>
    </TresGroup>
  </TresGroup>

  <GalaxyTrails
    :bodies="sceneBodies"
    :entering-ids="enteringBodyIds"
    :fade-duration="BODY_FADE_IN_DURATION"
  />

  <GalaxyObjectInstances
    v-if="instancedBodies.length > 0"
    :bodies="instancedBodies"
    :capacity="instancedBodyCapacity"
    :entering-ids="enteringBodyIds"
    :fade-duration="BODY_FADE_IN_DURATION"
    @select="emit('select', $event)"
  />

  <!-- One galaxy object component per profile, each rendering its body-specific mesh. -->
  <GalaxyObject
    v-for="body in componentBodies"
    :key="body.id"
    :body="body"
    :entering="enteringBodyIds.has(body.id)"
    :full-detail="fullDetailBodyIds.has(body.id)"
    :selected="props.selectedId === body.id"
    @select="emit('select', $event)"
  />
</template>
