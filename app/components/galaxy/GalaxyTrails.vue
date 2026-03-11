<script setup lang="ts">
import type { GalaxySceneBody } from '~~/shared/galaxy'
import { useLoop, useTres } from '@tresjs/core'
import { BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Vector3 } from 'three'
import { getOrbitAngularSpeed, getSceneBodyPosition, getSceneBodyScale, getSceneBodyTrailHex } from '~~/shared/galaxy'

const props = defineProps<{
  bodies: GalaxySceneBody[]
  enteringIds: Set<string>
  fadeDuration: number
}>()

const TRAIL_SEGMENT_COUNT = 4
const TRAIL_SEGMENT_ARC = 0.16
const TRAIL_HEAD_WIDTH = 0.41
const TRAIL_TAIL_WIDTH = 0.08
const TRAIL_OPACITY = 0.2
const TRAIL_TRIANGLE_COUNT = TRAIL_SEGMENT_COUNT * 2 - 1
const TRAIL_VERTEX_COUNT = TRAIL_TRIANGLE_COUNT * 3
const TRAIL_CAPACITY_FLOOR = 1024

const geometry = new BufferGeometry()
const trailSamplePoints = createTrailPointArray(TRAIL_SEGMENT_COUNT + 1)
const trailLeftPoints = createTrailPointArray(TRAIL_SEGMENT_COUNT)
const trailRightPoints = createTrailPointArray(TRAIL_SEGMENT_COUNT)
const trailSegmentDirection = new Vector3()
const trailCameraDirection = new Vector3()
const trailWidthDirection = new Vector3()
const trailPreviousWidthDirection = new Vector3()
const trailWorldPoint = new Vector3()
const trailUpFallback = new Vector3(0, 1, 0)
const trailSideFallback = new Vector3(1, 0, 0)
const trailCurrentColor = new Color()
const trailNextColor = new Color()
const trailTipColor = new Color()
const { camera } = useTres()
const { onBeforeRender } = useLoop()

let attributeCapacity = 0
let positionAttribute = new Float32BufferAttribute(new Float32Array(0), 3)
let colorAttribute = new Float32BufferAttribute(new Float32Array(0), 3)
let lastElapsed = 0
let colorBufferDirty = true
let hasActiveFade = false
const fadeStartsById = new Map<string, number>()

function createTrailPointArray(length: number) {
  const points: Vector3[] = []

  for (let index = 0; index < length; index += 1) {
    points.push(new Vector3())
  }

  return points
}

function getTrailPoint(points: Vector3[], index: number) {
  return points[index]!
}

function getCapacity(bodyCount: number) {
  return Math.max(TRAIL_CAPACITY_FLOOR, bodyCount)
}

function ensureCapacity(bodyCount: number) {
  const nextCapacity = getCapacity(bodyCount)

  if (nextCapacity === attributeCapacity) {
    geometry.setDrawRange(0, bodyCount * TRAIL_VERTEX_COUNT)
    return
  }

  attributeCapacity = nextCapacity
  positionAttribute = new Float32BufferAttribute(new Float32Array(nextCapacity * TRAIL_VERTEX_COUNT * 3), 3)
  colorAttribute = new Float32BufferAttribute(new Float32Array(nextCapacity * TRAIL_VERTEX_COUNT * 3), 3)
  positionAttribute.setUsage(DynamicDrawUsage)
  colorAttribute.setUsage(DynamicDrawUsage)
  geometry.setAttribute('position', positionAttribute)
  geometry.setAttribute('color', colorAttribute)
  geometry.setDrawRange(0, bodyCount * TRAIL_VERTEX_COUNT)
  colorBufferDirty = true
}

function writeVertexPosition(vertexIndex: number, point: Vector3) {
  positionAttribute.setXYZ(vertexIndex, point.x, point.y, point.z)
}

function writeVertexColor(vertexIndex: number, color: Color) {
  colorAttribute.setXYZ(vertexIndex, color.r, color.g, color.b)
}

function writeTrianglePositions(vertexOffset: number, pointA: Vector3, pointB: Vector3, pointC: Vector3) {
  writeVertexPosition(vertexOffset + 0, pointA)
  writeVertexPosition(vertexOffset + 1, pointB)
  writeVertexPosition(vertexOffset + 2, pointC)
}

function writeTriangleColors(vertexOffset: number, colorA: Color, colorB: Color, colorC: Color) {
  writeVertexColor(vertexOffset + 0, colorA)
  writeVertexColor(vertexOffset + 1, colorB)
  writeVertexColor(vertexOffset + 2, colorC)
}

function getTrailSampleWidth(index: number) {
  if (index >= TRAIL_SEGMENT_COUNT) {
    return 0
  }

  const progress = index / (TRAIL_SEGMENT_COUNT - 1)
  return TRAIL_HEAD_WIDTH + (TRAIL_TAIL_WIDTH - TRAIL_HEAD_WIDTH) * progress
}

function getTrailSampleIntensity(index: number) {
  const progress = index / TRAIL_SEGMENT_COUNT
  return 1 - progress * 0.78
}

function getPerspectiveWidthFloor(distance: number) {
  return 0.05 + Math.min(0.18, distance * 0.0012)
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

function updateBodyTrail(body: GalaxySceneBody, elapsed: number, vertexOffset: number, writeColors: boolean) {
  const activeCamera = camera.value

  if (!activeCamera) {
    return {
      nextVertexOffset: vertexOffset,
      fading: false,
    }
  }

  const timeStep = TRAIL_SEGMENT_ARC / Math.max(getOrbitAngularSpeed(Number(body.orbitSpeed)), 0.001)
  const fadeProgress = writeColors ? getFadeProgress(body.id, elapsed) : 1

  for (let index = 0; index <= TRAIL_SEGMENT_COUNT; index += 1) {
    const [trailX, trailY, trailZ] = getSceneBodyPosition(body, elapsed - timeStep * index)
    getTrailPoint(trailSamplePoints, index).set(trailX, trailY, trailZ)
  }

  trailPreviousWidthDirection.set(0, 0, 0)

  for (let index = 0; index < TRAIL_SEGMENT_COUNT; index += 1) {
    const samplePoint = getTrailPoint(trailSamplePoints, index)

    if (index === 0) {
      trailSegmentDirection.subVectors(
        getTrailPoint(trailSamplePoints, 1),
        getTrailPoint(trailSamplePoints, 0),
      )
    }
    else {
      trailSegmentDirection.subVectors(
        getTrailPoint(trailSamplePoints, index + 1),
        getTrailPoint(trailSamplePoints, index - 1),
      )
    }

    if (trailSegmentDirection.lengthSq() < 0.0001) {
      getTrailPoint(trailLeftPoints, index).copy(samplePoint)
      getTrailPoint(trailRightPoints, index).copy(samplePoint)
      continue
    }

    trailWorldPoint.copy(samplePoint)
    trailCameraDirection.copy(activeCamera.position).sub(trailWorldPoint)
    const cameraDistance = Math.sqrt(trailCameraDirection.lengthSq())
    trailWidthDirection.crossVectors(trailCameraDirection, trailSegmentDirection)

    if (trailWidthDirection.lengthSq() < 0.0001) {
      trailWidthDirection.crossVectors(trailSegmentDirection, trailUpFallback)
    }

    if (trailWidthDirection.lengthSq() < 0.0001) {
      trailWidthDirection.crossVectors(trailSegmentDirection, trailSideFallback)
    }

    if (index > 0 && trailPreviousWidthDirection.dot(trailWidthDirection) < 0) {
      trailWidthDirection.multiplyScalar(-1)
    }

    const width = Math.max(
      getSceneBodyScale(body) * getTrailSampleWidth(index),
      getPerspectiveWidthFloor(cameraDistance),
    )

    trailWidthDirection.normalize().multiplyScalar(width)
    trailPreviousWidthDirection.copy(trailWidthDirection)
    getTrailPoint(trailLeftPoints, index).copy(samplePoint).add(trailWidthDirection)
    getTrailPoint(trailRightPoints, index).copy(samplePoint).sub(trailWidthDirection)
  }

  for (let index = 0; index < TRAIL_SEGMENT_COUNT - 1; index += 1) {
    writeTrianglePositions(
      vertexOffset,
      getTrailPoint(trailLeftPoints, index),
      getTrailPoint(trailRightPoints, index),
      getTrailPoint(trailLeftPoints, index + 1),
    )

    if (writeColors) {
      trailCurrentColor.set(getSceneBodyTrailHex(body)).multiplyScalar(getTrailSampleIntensity(index) * fadeProgress)
      trailNextColor.set(getSceneBodyTrailHex(body)).multiplyScalar(getTrailSampleIntensity(index + 1) * fadeProgress)
      writeTriangleColors(
        vertexOffset,
        trailCurrentColor,
        trailCurrentColor,
        trailNextColor,
      )
    }

    vertexOffset += 3

    writeTrianglePositions(
      vertexOffset,
      getTrailPoint(trailRightPoints, index),
      getTrailPoint(trailRightPoints, index + 1),
      getTrailPoint(trailLeftPoints, index + 1),
    )

    if (writeColors) {
      writeTriangleColors(
        vertexOffset,
        trailCurrentColor,
        trailNextColor,
        trailNextColor,
      )
    }

    vertexOffset += 3
  }

  writeTrianglePositions(
    vertexOffset,
    getTrailPoint(trailLeftPoints, TRAIL_SEGMENT_COUNT - 1),
    getTrailPoint(trailRightPoints, TRAIL_SEGMENT_COUNT - 1),
    getTrailPoint(trailSamplePoints, TRAIL_SEGMENT_COUNT),
  )

  if (writeColors) {
    trailCurrentColor.set(getSceneBodyTrailHex(body)).multiplyScalar(getTrailSampleIntensity(TRAIL_SEGMENT_COUNT - 1) * fadeProgress)
    trailTipColor.set(getSceneBodyTrailHex(body)).multiplyScalar(0.18 * fadeProgress)
    writeTriangleColors(
      vertexOffset,
      trailCurrentColor,
      trailCurrentColor,
      trailTipColor,
    )
  }

  return {
    nextVertexOffset: vertexOffset + 3,
    fading: fadeProgress < 1,
  }
}

function updateTrails(elapsed: number) {
  lastElapsed = elapsed
  syncFadeStarts()
  ensureCapacity(props.bodies.length)
  const shouldUpdateColors = colorBufferDirty || hasActiveFade || fadeStartsById.size > 0
  const canWriteColors = shouldUpdateColors && Boolean(camera.value)

  let vertexOffset = 0
  let nextHasActiveFade = false

  for (const body of props.bodies) {
    const result = updateBodyTrail(body, elapsed, vertexOffset, canWriteColors)
    vertexOffset = result.nextVertexOffset

    if (result.fading) {
      nextHasActiveFade = true
    }
  }

  geometry.setDrawRange(0, vertexOffset)
  positionAttribute.needsUpdate = true

  if (canWriteColors) {
    colorAttribute.needsUpdate = true
    colorBufferDirty = false
  }

  hasActiveFade = nextHasActiveFade
}

watch(
  () => props.bodies.map(body => `${body.id}:${getSceneBodyTrailHex(body)}`).join('|'),
  () => {
    ensureCapacity(props.bodies.length)
    colorBufferDirty = true
  },
  {
    immediate: true,
  },
)

watch(
  () => [...props.enteringIds].toSorted().join('|'),
  () => {
    syncFadeStarts()
    colorBufferDirty = true
  },
  {
    immediate: true,
  },
)

onBeforeRender(({ elapsed }) => {
  updateTrails(elapsed)
})

onBeforeUnmount(() => {
  geometry.dispose()
})
</script>

<template>
  <TresMesh
    :geometry="geometry"
    :frustum-culled="false"
    :render-order="0"
  >
    <TresMeshBasicMaterial
      vertex-colors
      :opacity="TRAIL_OPACITY"
      transparent
      :side="DoubleSide"
      :depth-write="false"
    />
  </TresMesh>
</template>
