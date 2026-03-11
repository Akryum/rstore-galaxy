<script setup lang="ts">
import type { BufferGeometry as ThreeBufferGeometry } from 'three'
import type { GalaxyObjectVisualProps } from './shared'
import { BufferGeometry, Color, Float32BufferAttribute, MathUtils } from 'three'
import { useGalaxyObjectVisualState } from './shared'
import { spacewhaleLowDetailGeometry } from './shared-geometries'

const props = defineProps<GalaxyObjectVisualProps>()
const { colorHex, glowHex, trailHex } = useGalaxyObjectVisualState(props)

interface SpacewhaleGeometryOptions {
  lengthSegments: number
  radialSegments: number
}

interface SpacewhaleTentacleTransform {
  key: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

const HIGH_DETAIL_OPTIONS: SpacewhaleGeometryOptions = {
  lengthSegments: 44,
  radialSegments: 26,
}

const highDetailScale = computed<[number, number, number]>(() => {
  return [props.selectedScale, props.selectedScale, props.selectedScale]
})

const highDetailGeometry = shallowRef<ThreeBufferGeometry | null>(null)
const spacewhaleTentacleGeometry = shallowRef<ThreeBufferGeometry | null>(null)
const tentacleTransforms: SpacewhaleTentacleTransform[] = [
  {
    key: 'upper-left',
    position: [0.14, -0.04, 0.5],
    rotation: [0.14, 0.16, 0.1],
    scale: [1.02, 0.9, 0.82],
  },
  {
    key: 'mid-left',
    position: [0.04, -0.18, 0.66],
    rotation: [0.2, 0.26, -0.02],
    scale: [1.08, 1, 0.96],
  },
  {
    key: 'lower-left',
    position: [-0.12, -0.3, 0.82],
    rotation: [0.28, 0.34, -0.14],
    scale: [1.14, 1.08, 1.08],
  },
  {
    key: 'upper-right',
    position: [0.14, -0.04, -0.5],
    rotation: [-0.14, -0.16, -0.1],
    scale: [1.02, 0.9, 0.82],
  },
  {
    key: 'mid-right',
    position: [0.04, -0.18, -0.66],
    rotation: [-0.2, -0.26, 0.02],
    scale: [1.08, 1, 0.96],
  },
  {
    key: 'lower-right',
    position: [-0.12, -0.3, -0.82],
    rotation: [-0.28, -0.34, 0.14],
    scale: [1.14, 1.08, 1.08],
  },
]

const bodyColor = new Color()
const accentColor = new Color()
const bellyColor = new Color('#dfe8ff')
const glowColor = new Color()
const workingColor = new Color()

function ensureHighDetailGeometries() {
  if (!highDetailGeometry.value) {
    highDetailGeometry.value = createSpacewhaleGeometry(HIGH_DETAIL_OPTIONS)
  }

  if (!spacewhaleTentacleGeometry.value) {
    spacewhaleTentacleGeometry.value = createSpacewhaleTentacleGeometry()
  }
}

function syncHighDetailColors() {
  if (props.isLowDetail) {
    return
  }

  ensureHighDetailGeometries()
  applySpacewhaleGeometryColors(highDetailGeometry.value!, HIGH_DETAIL_OPTIONS)
  applySpacewhaleTentacleColors(spacewhaleTentacleGeometry.value!)
}

watch(() => props.isLowDetail, (isLowDetail) => {
  if (!isLowDetail) {
    syncHighDetailColors()
  }
}, { immediate: true })

watch(
  () => [colorHex.value, trailHex.value, glowHex.value],
  () => {
    syncHighDetailColors()
  },
  { immediate: true },
)

function gaussian(value: number, center: number, width: number) {
  const offset = (value - center) / width
  return Math.exp(-(offset * offset))
}

function smoothBand(value: number, start: number, end: number) {
  return MathUtils.smoothstep(value, start, end) * (1 - MathUtils.smoothstep(value, end, 1))
}

function angularGaussian(angle: number, center: number, width: number) {
  const delta = Math.atan2(Math.sin(angle - center), Math.cos(angle - center))
  return Math.exp(-((delta / width) ** 2))
}

function getSpacewhalePoint(u: number, theta: number) {
  const sinTheta = Math.sin(theta)
  const cosTheta = Math.cos(theta)
  const noseBlend = MathUtils.smoothstep(u, 0.01, 0.12)
  const frontOrb = gaussian(u, 0.04, 0.065)
  const headBulge = gaussian(u, 0.14, 0.12)
  const torsoBulge = gaussian(u, 0.37, 0.24)
  const backBulge = gaussian(u, 0.58, 0.16)
  const tailStem = MathUtils.smoothstep(u, 0.58, 0.8)
  const tailFan = gaussian(u, 0.89, 0.07)
  const tailClosure = 1 - MathUtils.smoothstep(u, 0.9, 1)
  const sideFactor = Math.abs(cosTheta) ** 1.7
  const bellyFactor = Math.max(0, -sinTheta)

  let halfHeight = 0.03 + headBulge * 0.18 + torsoBulge * 0.58 + backBulge * 0.12
  let halfWidth = 0.03 + headBulge * 0.28 + torsoBulge * 0.78 + backBulge * 0.08

  halfHeight *= MathUtils.lerp(0.42, 1, noseBlend)
  halfWidth *= MathUtils.lerp(0.44, 1, noseBlend)
  halfHeight *= MathUtils.lerp(1, 0.22, tailStem)
  halfWidth *= MathUtils.lerp(1, 0.16, MathUtils.smoothstep(u, 0.64, 0.84))
  halfHeight += frontOrb * 0.08
  halfWidth += frontOrb * 0.08

  halfWidth += tailFan * sideFactor * 1.05 * tailClosure
  halfHeight += tailFan * (0.03 + Math.abs(sinTheta) * 0.08) * tailClosure

  let x = 1.62 - u * 3.92
  let y = sinTheta * halfHeight
  let z = cosTheta * halfWidth

  const foreheadLift = headBulge * angularGaussian(theta, Math.PI / 2, 0.82)
  y += 0.18 * foreheadLift
  x += 0.08 * foreheadLift

  const snoutRoundness = frontOrb * (0.75 + Math.abs(sinTheta) * 0.25)
  x += 0.12 * snoutRoundness
  y -= Math.max(0, -sinTheta) * frontOrb * 0.015

  const bellySheet = torsoBulge * angularGaussian(theta, Math.PI * 1.5, 0.96)
  y -= 0.08 * bellySheet
  z *= 1 + bellySheet * 0.08

  const dorsalSail = smoothBand(u, 0.42, 0.83) * angularGaussian(theta, Math.PI / 2, 0.34)
  y += 0.72 * dorsalSail
  z *= 1 - dorsalSail * 0.12

  const leftFin = gaussian(u, 0.42, 0.08) * angularGaussian(theta, Math.PI * 1.78, 0.24)
  const rightFin = gaussian(u, 0.42, 0.08) * angularGaussian(theta, Math.PI * 1.22, 0.24)
  const finSweep = Math.max(leftFin, rightFin)
  z += Math.sign(cosTheta || 1) * finSweep * 0.92
  y -= finSweep * 0.34
  x += finSweep * 0.08

  const tailRibbons = gaussian(u, 0.72, 0.12) * sideFactor * Math.max(0, -sinTheta * 0.35 + 0.65)
  z += Math.sign(cosTheta || 1) * tailRibbons * 0.2
  y -= tailRibbons * 0.08

  x -= tailFan * sideFactor * 0.52 * tailClosure
  y += tailFan * (1 - sideFactor) * 0.04 * tailClosure
  y -= bellyFactor * tailFan * 0.04 * tailClosure

  return [x, y, z] as const
}

function getSpacewhaleVertexColor(target: Color, u: number, theta: number) {
  const sinTheta = Math.sin(theta)
  const cosTheta = Math.cos(theta)
  const torsoBulge = gaussian(u, 0.36, 0.24)
  const dorsalSail = smoothBand(u, 0.42, 0.83) * angularGaussian(theta, Math.PI / 2, 0.38)
  const bellyGlow = torsoBulge * angularGaussian(theta, Math.PI * 1.5, 0.84)
  const flankGlow = (
    gaussian(u, 0.22, 0.06)
    + gaussian(u, 0.42, 0.07) * 0.9
    + gaussian(u, 0.64, 0.08) * 0.7
  ) * Math.abs(cosTheta) * Math.max(0, -sinTheta * 0.5 + 0.7)
  const tailTint = gaussian(u, 0.78, 0.16)
  target.copy(bodyColor)
  target.lerp(accentColor, 0.18 + tailTint * 0.28 + dorsalSail * 0.12)
  target.lerp(bellyColor, bellyGlow * 0.46)
  target.lerp(glowColor, flankGlow * 0.24 + dorsalSail * 0.08)

  return target
}

function createSpacewhaleGeometry(options: SpacewhaleGeometryOptions) {
  const ringVertexCount = options.radialSegments + 1
  const bodyVertexCount = (options.lengthSegments + 1) * ringVertexCount
  const frontCapIndex = bodyVertexCount
  const positions = new Float32Array((bodyVertexCount + 1) * 3)
  const colors = new Float32Array((bodyVertexCount + 1) * 3)
  const indices: number[] = []

  let vertexIndex = 0

  for (let lengthIndex = 0; lengthIndex <= options.lengthSegments; lengthIndex += 1) {
    const u = lengthIndex / options.lengthSegments

    for (let radialIndex = 0; radialIndex <= options.radialSegments; radialIndex += 1) {
      const theta = (radialIndex / options.radialSegments) * Math.PI * 2
      const [x, y, z] = getSpacewhalePoint(u, theta)
      const positionOffset = vertexIndex * 3

      positions[positionOffset + 0] = x
      positions[positionOffset + 1] = y
      positions[positionOffset + 2] = z

      vertexIndex += 1
    }
  }

  let frontCenterX = 0
  let frontCenterY = 0
  let frontCenterZ = 0

  for (let radialIndex = 0; radialIndex < options.radialSegments; radialIndex += 1) {
    const positionOffset = radialIndex * 3
    frontCenterX += positions[positionOffset + 0]!
    frontCenterY += positions[positionOffset + 1]!
    frontCenterZ += positions[positionOffset + 2]!
  }

  const frontCenterOffset = frontCapIndex * 3
  positions[frontCenterOffset + 0] = frontCenterX / options.radialSegments
  positions[frontCenterOffset + 1] = frontCenterY / options.radialSegments
  positions[frontCenterOffset + 2] = frontCenterZ / options.radialSegments

  for (let lengthIndex = 0; lengthIndex < options.lengthSegments; lengthIndex += 1) {
    for (let radialIndex = 0; radialIndex < options.radialSegments; radialIndex += 1) {
      const topLeft = lengthIndex * ringVertexCount + radialIndex
      const topRight = topLeft + 1
      const bottomLeft = topLeft + ringVertexCount
      const bottomRight = bottomLeft + 1

      indices.push(topLeft, topRight, bottomLeft)
      indices.push(bottomLeft, topRight, bottomRight)
    }
  }

  for (let radialIndex = 0; radialIndex < options.radialSegments; radialIndex += 1) {
    const nextRadialIndex = radialIndex + 1
    indices.push(frontCapIndex, nextRadialIndex, radialIndex)
  }

  const geometry = new BufferGeometry()
  geometry.setIndex(indices)
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  applySpacewhaleGeometryColors(geometry, options)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}

function getSpacewhaleTentacleVertexColor(target: Color, progress: number, widthMix: number, depthMix: number) {
  const edgeGlow = widthMix * 0.26 + depthMix * 0.12
  const rearGlow = MathUtils.smoothstep(progress, 0.4, 1)

  target.copy(accentColor)
  target.lerp(bodyColor, 0.22)
  target.lerp(glowColor, rearGlow * 0.34 + edgeGlow)

  return target
}

function createSpacewhaleTentacleGeometry() {
  const lengthSegments = 18
  const ringVertexCount = 4
  const vertexCount = (lengthSegments + 1) * ringVertexCount
  const positions = new Float32Array(vertexCount * 3)
  const colors = new Float32Array(vertexCount * 3)
  const indices: number[] = []

  let vertexIndex = 0

  for (let index = 0; index <= lengthSegments; index += 1) {
    const progress = index / lengthSegments
    const x = -1.48 * progress
    const centerY = -0.05 * progress - 0.18 * progress * progress + Math.sin(progress * Math.PI * 0.9) * 0.06
    const centerZ = Math.sin(progress * Math.PI * 0.72) * 0.04
    const flare = MathUtils.lerp(0.035, 0.24, progress ** 1.18) + gaussian(progress, 0.84, 0.16) * 0.1
    const thickness = MathUtils.lerp(0.014, 0.062, progress ** 1.32)
    const twist = progress * 0.48
    const sinTwist = Math.sin(twist)
    const cosTwist = Math.cos(twist)
    const ringOffsets: Array<[number, number]> = [
      [thickness, -flare],
      [thickness, flare],
      [-thickness, flare],
      [-thickness, -flare],
    ]

    for (let ringIndex = 0; ringIndex < ringOffsets.length; ringIndex += 1) {
      const [localY, localZ] = ringOffsets[ringIndex]!
      const y = centerY + localY * cosTwist - localZ * sinTwist
      const z = centerZ + localY * sinTwist + localZ * cosTwist
      const offset = vertexIndex * 3

      positions[offset + 0] = x
      positions[offset + 1] = y
      positions[offset + 2] = z

      vertexIndex += 1
    }
  }

  for (let index = 0; index < lengthSegments; index += 1) {
    const ringOffset = index * ringVertexCount
    const nextRingOffset = ringOffset + ringVertexCount

    for (let side = 0; side < ringVertexCount; side += 1) {
      const nextSide = (side + 1) % ringVertexCount
      const currentA = ringOffset + side
      const currentB = ringOffset + nextSide
      const nextA = nextRingOffset + side
      const nextB = nextRingOffset + nextSide

      indices.push(currentA, currentB, nextA)
      indices.push(nextA, currentB, nextB)
    }
  }

  const frontCapCenter = vertexCount
  const backCapCenter = vertexCount + 1
  const cappedPositions = new Float32Array((vertexCount + 2) * 3)
  const cappedColors = new Float32Array((vertexCount + 2) * 3)

  cappedPositions.set(positions)
  cappedColors.set(colors)

  cappedPositions[frontCapCenter * 3 + 0] = 0
  cappedPositions[frontCapCenter * 3 + 1] = 0
  cappedPositions[frontCapCenter * 3 + 2] = 0

  cappedPositions[backCapCenter * 3 + 0] = -1.48
  cappedPositions[backCapCenter * 3 + 1] = -0.17
  cappedPositions[backCapCenter * 3 + 2] = 0

  for (let side = 0; side < ringVertexCount; side += 1) {
    const nextSide = (side + 1) % ringVertexCount
    indices.push(frontCapCenter, nextSide, side)
  }

  const lastRingOffset = lengthSegments * ringVertexCount

  for (let side = 0; side < ringVertexCount; side += 1) {
    const nextSide = (side + 1) % ringVertexCount
    indices.push(backCapCenter, lastRingOffset + side, lastRingOffset + nextSide)
  }

  const geometry = new BufferGeometry()
  geometry.setIndex(indices)
  geometry.setAttribute('position', new Float32BufferAttribute(cappedPositions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(cappedColors, 3))
  applySpacewhaleTentacleColors(geometry)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}

function applySpacewhaleGeometryColors(geometry: ThreeBufferGeometry, options: SpacewhaleGeometryOptions) {
  const colorAttribute = geometry.getAttribute('color') as Float32BufferAttribute | undefined

  if (!colorAttribute) {
    return
  }

  bodyColor.set(colorHex.value)
  accentColor.set(trailHex.value)
  glowColor.set(glowHex.value)

  let vertexIndex = 0

  for (let lengthIndex = 0; lengthIndex <= options.lengthSegments; lengthIndex += 1) {
    const u = lengthIndex / options.lengthSegments

    for (let radialIndex = 0; radialIndex <= options.radialSegments; radialIndex += 1) {
      const theta = (radialIndex / options.radialSegments) * Math.PI * 2
      const color = getSpacewhaleVertexColor(workingColor, u, theta)

      colorAttribute.setXYZ(vertexIndex, color.r, color.g, color.b)
      vertexIndex += 1
    }
  }

  let frontColorR = 0
  let frontColorG = 0
  let frontColorB = 0

  for (let radialIndex = 0; radialIndex < options.radialSegments; radialIndex += 1) {
    frontColorR += colorAttribute.getX(radialIndex)
    frontColorG += colorAttribute.getY(radialIndex)
    frontColorB += colorAttribute.getZ(radialIndex)
  }

  colorAttribute.setXYZ(
    (options.lengthSegments + 1) * (options.radialSegments + 1),
    frontColorR / options.radialSegments,
    frontColorG / options.radialSegments,
    frontColorB / options.radialSegments,
  )

  colorAttribute.needsUpdate = true
}

function applySpacewhaleTentacleColors(geometry: ThreeBufferGeometry) {
  const positionAttribute = geometry.getAttribute('position') as Float32BufferAttribute | undefined
  const colorAttribute = geometry.getAttribute('color') as Float32BufferAttribute | undefined

  if (!positionAttribute || !colorAttribute) {
    return
  }

  bodyColor.set(colorHex.value)
  accentColor.set(trailHex.value)
  glowColor.set(glowHex.value)

  for (let index = 0; index < positionAttribute.count; index += 1) {
    const x = positionAttribute.getX(index)
    const y = positionAttribute.getY(index)
    const z = positionAttribute.getZ(index)
    const progress = MathUtils.clamp(-x / 1.48, 0, 1)
    const widthMix = MathUtils.clamp(Math.abs(z) / 0.34, 0, 1)
    const depthMix = MathUtils.clamp(Math.abs(y) / 0.18, 0, 1)
    const color = getSpacewhaleTentacleVertexColor(workingColor, progress, widthMix, depthMix)

    colorAttribute.setXYZ(index, color.r, color.g, color.b)
  }

  colorAttribute.needsUpdate = true
}

onBeforeUnmount(() => {
  highDetailGeometry.value?.dispose()
  spacewhaleTentacleGeometry.value?.dispose()
})
</script>

<template>
  <TresMesh
    v-if="props.isLowDetail"
    key="spacewhale-low"
    :geometry="spacewhaleLowDetailGeometry"
    :scale="highDetailScale"
  >
    <TresMeshBasicMaterial :color="colorHex" />
  </TresMesh>

  <TresMesh
    v-else-if="highDetailGeometry"
    key="spacewhale-high"
    :geometry="highDetailGeometry"
    :scale="highDetailScale"
  >
    <TresMeshStandardMaterial
      vertex-colors
      :emissive="glowHex"
      :emissive-intensity="0.48"
      :metalness="0.08"
      :roughness="0.72"
    />
  </TresMesh>

  <TresGroup v-if="!props.isLowDetail && spacewhaleTentacleGeometry" key="spacewhale-tentacles" :scale="highDetailScale">
    <template v-for="tentacle in tentacleTransforms" :key="tentacle.key">
      <TresMesh
        :geometry="spacewhaleTentacleGeometry"
        :position="tentacle.position"
        :rotation="tentacle.rotation"
        :scale="tentacle.scale"
      >
        <TresMeshStandardMaterial
          :emissive="glowHex"
          :emissive-intensity="0.2"
          :metalness="0.04"
          :roughness="0.76"
          vertex-colors
        />
      </TresMesh>
    </template>
  </TresGroup>
</template>
