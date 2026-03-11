<script setup lang="ts">
import type { InstancedMesh, BufferGeometry as ThreeBufferGeometry } from 'three'
import type { BodyType, GalaxySceneBody } from '~~/shared/galaxy'
import { useLoop } from '@tresjs/core'
import {
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Euler,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three'
import {
  getSceneBodyColorHex,
  getSceneBodyOrbitAngle,
  getSceneBodyPosition,
  getSceneBodyScale,
  getSceneBodyTilt,
  getSceneBodyTrailHex,
  getSceneBodyWobble,
} from '~~/shared/galaxy'
import {
  asteroidLowDetailGeometry,
  cometLowDetailGeometry,
  planetLowDetailGeometry,
  saucerLowDetailGeometry,
  spaceshipLowDetailGeometry,
  spacewhaleLowDetailGeometry,
  stationLowDetailGeometry,
} from './object-types/shared-geometries'

const props = withDefaults(defineProps<{
  bodies: GalaxySceneBody[]
  capacity?: number
  enteringIds: Set<string>
  fadeDuration: number
}>(), {
  capacity: 1024,
})

const emit = defineEmits<{
  select: [id: string]
}>()

const BODY_TYPE_ORDER: BodyType[] = [
  'planet',
  'asteroid',
  'station',
  'comet',
  'spaceship',
  'saucer',
  'spacewhale',
]

const TRAJECTORY_ALIGNMENT_LOOKAHEAD = 0.12
const SPACESHIP_SCALE_MULTIPLIER = 2.25

const groupedBodies = computed<Record<BodyType, GalaxySceneBody[]>>(() => {
  const groups: Record<BodyType, GalaxySceneBody[]> = {
    planet: [],
    asteroid: [],
    station: [],
    comet: [],
    spaceship: [],
    saucer: [],
    spacewhale: [],
  }

  for (const body of props.bodies) {
    groups[body.bodyType].push(body)
  }

  return groups
})

const instanceGeometries = {
  planet: planetLowDetailGeometry,
  asteroid: asteroidLowDetailGeometry,
  station: stationLowDetailGeometry,
  comet: cometLowDetailGeometry,
  spaceship: spaceshipLowDetailGeometry,
  saucer: saucerLowDetailGeometry,
  spacewhale: spacewhaleLowDetailGeometry,
} satisfies Record<BodyType, ThreeBufferGeometry>

const instanceMaterials = {
  planet: new MeshBasicMaterial({ color: '#ffffff', side: DoubleSide }),
  asteroid: new MeshBasicMaterial({ color: '#ffffff' }),
  station: new MeshBasicMaterial({ color: '#ffffff' }),
  comet: new MeshBasicMaterial({ color: '#ffffff' }),
  spaceship: new MeshBasicMaterial({ color: '#ffffff' }),
  saucer: new MeshBasicMaterial({ color: '#ffffff' }),
  spacewhale: new MeshBasicMaterial({ color: '#ffffff' }),
} satisfies Record<BodyType, MeshBasicMaterial>

const meshRefs = {
  planet: shallowRef<any>(null),
  asteroid: shallowRef<any>(null),
  station: shallowRef<any>(null),
  comet: shallowRef<any>(null),
  spaceship: shallowRef<any>(null),
  saucer: shallowRef<any>(null),
  spacewhale: shallowRef<any>(null),
}

const instanceMatrix = new Matrix4()
const instancePosition = new Vector3()
const instanceScale = new Vector3()
const instanceColor = new Color()
const instanceQuaternion = new Quaternion()
const trajectoryQuaternion = new Quaternion()
const localSpinQuaternion = new Quaternion()
const trajectoryDirection = new Vector3()
const trajectoryForwardAxis = new Vector3(1, 0, 0)
const cometTailAxis = new Vector3(0, 1, 0)
const instanceEuler = new Euler()

const { onBeforeRender } = useLoop()

let lastElapsed = 0
let hasActiveFade = false
const fadeStartsById = new Map<string, number>()

function setMeshRef(type: BodyType, value: any) {
  meshRefs[type].value = value
}

function resolveMesh(type: BodyType) {
  const source = meshRefs[type].value
  return source?.instance?.value ?? source?.instance ?? source ?? null
}

function getInstanceColor(body: GalaxySceneBody) {
  switch (body.bodyType) {
    case 'station':
    case 'comet':
      return getSceneBodyTrailHex(body)
    default:
      return getSceneBodyColorHex(body)
  }
}

function syncFadeStarts() {
  for (const id of fadeStartsById.keys()) {
    if (!props.enteringIds.has(id)) {
      fadeStartsById.delete(id)
    }
  }

  for (const id of props.enteringIds) {
    if (!fadeStartsById.has(id)) {
      fadeStartsById.set(id, lastElapsed)
    }
  }
}

function getFadeProgress(bodyId: string, elapsed: number) {
  const startElapsed = fadeStartsById.get(bodyId)

  if (startElapsed == null) {
    return 1
  }

  const rawProgress = Math.min(1, Math.max(0, (elapsed - startElapsed) / props.fadeDuration))

  if (rawProgress >= 1) {
    return 1
  }

  return 1 - ((1 - rawProgress) ** 3)
}

function setInstanceScale(body: GalaxySceneBody) {
  const scale = getSceneBodyScale(body)

  switch (body.bodyType) {
    case 'spaceship':
      instanceScale.setScalar(scale * SPACESHIP_SCALE_MULTIPLIER)
      break
    default:
      instanceScale.setScalar(scale)
      break
  }
}

function setInstanceRotation(body: GalaxySceneBody, elapsed: number, x: number, y: number, z: number) {
  const wobble = getSceneBodyWobble(body, elapsed)
  const orbitAngle = getSceneBodyOrbitAngle(body, elapsed)
  const tilt = getSceneBodyTilt(body)

  if (body.bodyType === 'comet') {
    trajectoryDirection.set(x, y, z)

    if (trajectoryDirection.lengthSq() > 0.0001) {
      trajectoryDirection.normalize()
      instanceQuaternion.setFromUnitVectors(cometTailAxis, trajectoryDirection)
      localSpinQuaternion.setFromAxisAngle(cometTailAxis, orbitAngle + tilt + wobble)
      instanceQuaternion.multiply(localSpinQuaternion)
      return
    }
  }

  if (body.bodyType === 'spaceship' || body.bodyType === 'spacewhale') {
    const [nextX, nextY, nextZ] = getSceneBodyPosition(body, elapsed + TRAJECTORY_ALIGNMENT_LOOKAHEAD)
    trajectoryDirection.set(nextX - x, nextY - y, nextZ - z)

    if (trajectoryDirection.lengthSq() > 0.0001) {
      trajectoryDirection.normalize()
      trajectoryQuaternion.setFromUnitVectors(trajectoryForwardAxis, trajectoryDirection)
      instanceEuler.setFromQuaternion(trajectoryQuaternion)
      instanceEuler.x += tilt
      instanceEuler.z += wobble
      instanceQuaternion.setFromEuler(instanceEuler)
      return
    }
  }

  instanceEuler.set(tilt, orbitAngle, wobble)
  instanceQuaternion.setFromEuler(instanceEuler)
}

function configureMeshes() {
  for (const type of BODY_TYPE_ORDER) {
    const mesh = resolveMesh(type) as InstancedMesh | null

    if (!mesh) {
      continue
    }

    mesh.instanceMatrix.setUsage(DynamicDrawUsage)
    mesh.count = groupedBodies.value[type].length
  }
}

function updateInstanceColors() {
  for (const type of BODY_TYPE_ORDER) {
    const mesh = resolveMesh(type) as InstancedMesh | null

    if (!mesh) {
      continue
    }

    const bodies = groupedBodies.value[type]

    for (let index = 0; index < bodies.length; index += 1) {
      mesh.setColorAt(index, instanceColor.set(getInstanceColor(bodies[index]!)))
    }

    mesh.count = bodies.length

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }
}

function updateInstanceMatrices(elapsed: number) {
  lastElapsed = elapsed
  syncFadeStarts()
  const shouldUpdateColors = hasActiveFade || fadeStartsById.size > 0
  let nextHasActiveFade = false

  for (const type of BODY_TYPE_ORDER) {
    const mesh = resolveMesh(type) as InstancedMesh | null

    if (!mesh) {
      continue
    }

    const bodies = groupedBodies.value[type]

    for (let index = 0; index < bodies.length; index += 1) {
      const body = bodies[index]!
      const [x, y, z] = getSceneBodyPosition(body, elapsed)
      const fadeProgress = shouldUpdateColors ? getFadeProgress(body.id, elapsed) : 1

      instancePosition.set(x, y, z)
      setInstanceScale(body)
      instanceScale.multiplyScalar(fadeProgress)
      setInstanceRotation(body, elapsed, x, y, z)
      instanceMatrix.compose(instancePosition, instanceQuaternion, instanceScale)
      mesh.setMatrixAt(index, instanceMatrix)

      if (shouldUpdateColors) {
        mesh.setColorAt(index, instanceColor.set(getInstanceColor(body)).multiplyScalar(fadeProgress))
      }

      if (fadeProgress < 1) {
        nextHasActiveFade = true
      }
    }

    mesh.count = bodies.length
    mesh.instanceMatrix.needsUpdate = true

    if (shouldUpdateColors && mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }

  hasActiveFade = nextHasActiveFade
}

function handleClick(type: BodyType, event: { instanceId?: number }) {
  if (typeof event.instanceId !== 'number') {
    return
  }

  const body = groupedBodies.value[type][event.instanceId]

  if (!body || body.interactive === false) {
    return
  }

  emit('select', body.id)
}

watch(
  () => props.bodies.map(body => `${body.id}:${body.bodyType}:${getSceneBodyColorHex(body)}:${getSceneBodyTrailHex(body)}`).join('|'),
  async () => {
    await nextTick()
    configureMeshes()
    updateInstanceColors()
    updateInstanceMatrices(lastElapsed)
  },
  {
    immediate: true,
  },
)

watch(
  () => [...props.enteringIds].toSorted().join('|'),
  () => {
    syncFadeStarts()
  },
  {
    immediate: true,
  },
)

onMounted(() => {
  configureMeshes()
  updateInstanceColors()
})

onBeforeRender(({ elapsed }) => {
  updateInstanceMatrices(elapsed)
})

onBeforeUnmount(() => {
  for (const type of BODY_TYPE_ORDER) {
    instanceMaterials[type].dispose()
  }
})
</script>

<template>
  <TresInstancedMesh
    v-for="type in BODY_TYPE_ORDER"
    :key="type"
    :ref="value => setMeshRef(type, value)"
    :args="[instanceGeometries[type], instanceMaterials[type], props.capacity]"
    :frustum-culled="false"
    @click.stop="handleClick(type, $event)"
  />
</template>
