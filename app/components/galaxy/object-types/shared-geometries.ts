import type { BufferGeometry as ThreeBufferGeometry } from 'three'
import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  MathUtils,
  RingGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { COMET_TAIL_LENGTH } from './comet'

export const planetLowDetailGeometry = createPlanetLowDetailGeometry()
export const planetDetailGeometry = new SphereGeometry(1, 32, 32)
export const planetRingInnerGeometry = new RingGeometry(1.34, 1.6, 160, 6)
export const planetRingMainGeometry = new RingGeometry(1.67, 2.14, 160, 6)
export const planetRingOuterGeometry = new RingGeometry(2.2, 2.48, 160, 6)

export const cometLowDetailGeometry = createCometLowDetailGeometry()
export const cometCoreGeometry = new SphereGeometry(1, 28, 28)
export const cometIceCapGeometry = new SphereGeometry(1, 20, 20)
export const cometAccentGeometry = new SphereGeometry(1, 16, 16)
export const cometParticleGeometry = new IcosahedronGeometry(1, 0)
export const cometOuterPlumeGeometry = new ConeGeometry(0.5, COMET_TAIL_LENGTH, 28, 1, false)
export const cometInnerPlumeGeometry = new ConeGeometry(0.44, COMET_TAIL_LENGTH * 0.72, 20, 1, false)

export const asteroidLowDetailGeometry = createAsteroidGeometry(1, 0, 0.22)
export const asteroidCoreGeometry = createAsteroidGeometry(1, 2, 0.22)

export const spaceshipHullGeometry = createDestroyerHullGeometry()
export const spaceshipDeckGeometry = createDestroyerDeckGeometry()
export const spaceshipLowDetailGeometry = createSpaceshipLowDetailGeometry()
export const spaceshipBridgeLightGeometry = new SphereGeometry(1, 14, 14)

export const stationLowDetailGeometry = createStationLowDetailGeometry()
export const saucerLowDetailGeometry = createSaucerLowDetailGeometry()
export const saucerBoltGeometry = new IcosahedronGeometry(1, 0)
export const spacewhaleLowDetailGeometry = createSpacewhaleLowDetailGeometry()

function mergeSilhouetteGeometries(geometries: ThreeBufferGeometry[]) {
  const mergeSources = geometries.map(geometry => geometry.index ? geometry.toNonIndexed() : geometry)
  const mergedGeometry = mergeGeometries(mergeSources, false)

  for (let index = 0; index < geometries.length; index += 1) {
    geometries[index]!.dispose()

    if (mergeSources[index] !== geometries[index]) {
      mergeSources[index]!.dispose()
    }
  }

  if (!mergedGeometry) {
    throw new Error('Failed to merge low-detail galaxy geometries.')
  }

  mergedGeometry.computeVertexNormals()
  mergedGeometry.computeBoundingSphere()

  return mergedGeometry
}

function createPlanetLowDetailGeometry() {
  const body = new IcosahedronGeometry(1, 0)
  return mergeSilhouetteGeometries([body])
}

function createCometLowDetailGeometry() {
  const core = new IcosahedronGeometry(1, 0)
  const iceCap = new IcosahedronGeometry(1, 0)
  const accent = new IcosahedronGeometry(1, 0)
  const plume = new ConeGeometry(0.44, 3.8, 7, 1, false)

  core.scale(1, 0.92, 1)

  iceCap.scale(0.56, 0.38, 0.46)
  iceCap.translate(0.18, 0.08, 0)

  accent.scale(0.24, 0.12, 0.16)
  accent.translate(-0.22, -0.08, 0.12)

  plume.translate(0, 1.9, 0)

  return mergeSilhouetteGeometries([core, iceCap, accent, plume])
}

function createAsteroidGeometry(radius: number, detail: number, displacement: number) {
  const geometry = new IcosahedronGeometry(radius, detail)
  const positionAttribute = geometry.getAttribute('position') as Float32BufferAttribute
  const direction = new Vector3()
  const lobeA = new Vector3(0.82, 0.24, -0.52).normalize()
  const lobeB = new Vector3(-0.48, -0.68, 0.56).normalize()
  const lobeC = new Vector3(0.18, 0.94, 0.3).normalize()

  for (let index = 0; index < positionAttribute.count; index += 1) {
    direction.fromBufferAttribute(positionAttribute, index).normalize()

    const ridgeNoise = (
      Math.sin(direction.x * 7.4)
      + Math.cos(direction.y * 6.2)
      + Math.sin((direction.z + direction.x) * 5.8)
    ) * 0.045
    const lobeNoise = Math.max(0, direction.dot(lobeA)) * 0.18 + Math.max(0, direction.dot(lobeB)) * 0.12
    const pocketNoise = Math.max(0, direction.dot(lobeC)) * 0.14
    const radiusScale = 1 + ridgeNoise + lobeNoise * displacement - pocketNoise * displacement * 0.75

    positionAttribute.setXYZ(
      index,
      direction.x * radius * radiusScale,
      direction.y * radius * radiusScale,
      direction.z * radius * radiusScale,
    )
  }

  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}

function createSpaceshipLowDetailGeometry() {
  const hull = spaceshipHullGeometry.clone()
  const deck = spaceshipDeckGeometry.clone()
  const bridge = new BoxGeometry(1, 1, 1)
  const mast = new BoxGeometry(1, 1, 1)
  const portWing = new BoxGeometry(1, 1, 1)
  const starboardWing = new BoxGeometry(1, 1, 1)
  const keel = new BoxGeometry(1, 1, 1)
  const engineBlock = new BoxGeometry(1, 1, 1)

  hull.scale(1.82, 0.26, 1.02)

  deck.scale(1.02, 0.98, 1.02)
  deck.translate(0.04, 0.09, 0)

  bridge.scale(0.38, 0.13, 0.28)
  bridge.translate(-0.58, 0.3, 0)

  mast.scale(0.16, 0.22, 0.16)
  mast.translate(-0.78, 0.48, 0)

  portWing.scale(0.64, 0.05, 0.08)
  portWing.translate(-0.18, 0.04, 0.66)

  starboardWing.scale(0.64, 0.05, 0.08)
  starboardWing.translate(-0.18, 0.04, -0.66)

  keel.scale(1.35, 0.05, 0.46)
  keel.translate(0.14, -0.08, 0)

  engineBlock.scale(0.18, 0.1, 0.34)
  engineBlock.translate(-1.04, -0.01, 0)

  return mergeSilhouetteGeometries([hull, deck, bridge, mast, portWing, starboardWing, keel, engineBlock])
}

function createDestroyerHullGeometry() {
  const shape = new Shape()
  shape.moveTo(-0.5, 0.8)
  shape.lineTo(0.75, 0.3)
  shape.lineTo(0.8, 0.2)
  shape.lineTo(1.2, 0)
  shape.lineTo(0.8, -0.2)
  shape.lineTo(0.75, -0.3)
  shape.lineTo(-0.5, -0.8)

  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.3,
    bevelEnabled: false,
    steps: 1,
  })

  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, -0.11, 0)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}

function createDestroyerDeckGeometry() {
  const shape = new Shape()
  shape.moveTo(-0.94, 0.52)
  shape.lineTo(-0.34, 0.2)
  shape.lineTo(0.48, 0.14)
  shape.lineTo(0.9, 0)
  shape.lineTo(0.48, -0.14)
  shape.lineTo(-0.34, -0.2)
  shape.lineTo(-0.94, -0.52)

  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: false,
    steps: 1,
  })

  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, -0.04, 0)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}

function createStationLowDetailGeometry() {
  const ring = new TorusGeometry(0.94, 0.18, 6, 18)
  const hub = new CylinderGeometry(0.22, 0.3, 0.86, 10)
  const spine = new CylinderGeometry(0.12, 0.12, 0.92, 8)
  const spokes = Array.from({ length: 3 }, (_, index) => {
    const spoke = new CylinderGeometry(0.045, 0.045, 2.02, 6)

    spoke.rotateZ((index / 3) * Math.PI)

    return spoke
  })

  spine.rotateX(Math.PI / 2)

  return mergeSilhouetteGeometries([ring, hub, spine, ...spokes])
}

function createSaucerLowDetailGeometry() {
  const hull = new CylinderGeometry(1.02, 1.34, 0.16, 10)
  const upperHull = new CylinderGeometry(0.72, 0.88, 0.12, 10)
  const lowerLip = new CylinderGeometry(0.94, 1.06, 0.08, 10)
  const dome = new SphereGeometry(1, 10, 6)
  const undersidePod = new CylinderGeometry(0.18, 0.24, 0.16, 8)

  upperHull.translate(0, 0.08, 0)
  lowerLip.translate(0, -0.09, 0)

  dome.scale(0.66, 0.3, 0.66)
  dome.translate(0, 0.2, 0)

  undersidePod.translate(0, -0.2, 0)

  return mergeSilhouetteGeometries([hull, upperHull, lowerLip, dome, undersidePod])
}

interface SpacewhaleGeometryOptions {
  lengthSegments: number
  radialSegments: number
}

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

function createSpacewhaleLowDetailGeometry() {
  const options: SpacewhaleGeometryOptions = {
    lengthSegments: 10,
    radialSegments: 6,
  }
  const ringVertexCount = options.radialSegments + 1
  const bodyVertexCount = (options.lengthSegments + 1) * ringVertexCount
  const frontCapIndex = bodyVertexCount
  const positions = new Float32Array((bodyVertexCount + 1) * 3)
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
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}
