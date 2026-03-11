export const BODY_TYPES = ['planet', 'asteroid', 'station', 'comet', 'spaceship', 'saucer', 'spacewhale'] as const
export type BodyType = typeof BODY_TYPES[number]

export const ORBIT_DISTANCE_RANGE = {
  min: 24,
  max: 96,
  step: 1,
} as const

export const ORBIT_SPEED_MULTIPLIER_SCALE = 100

export const ORBIT_SPEED_MULTIPLIER_RANGE = {
  min: 0.5,
  max: 2,
  step: 0.05,
} as const

export const ORBIT_SPEED_RANGE = {
  min: 50,
  max: 200,
  step: 5,
} as const

export const ORBIT_ANGULAR_SPEED_FACTOR = 0.22

export const REALTIME_STRESS_LOGIN_PREFIX = 'ws-stress-'
export const REALTIME_STRESS_GITHUB_ID_PREFIX = 'ws-stress:'
export const REALTIME_STRESS_COUNT_RANGE = {
  min: 25,
  max: 1000,
  step: 25,
} as const
export const REALTIME_STRESS_BATCH_SIZE_RANGE = {
  min: 1,
  max: 100,
  step: 1,
} as const
export const REALTIME_STRESS_INTERVAL_RANGE = {
  min: 0,
  max: 500,
  step: 10,
} as const
export const REALTIME_STRESS_UPDATE_ROUNDS_RANGE = {
  min: 0,
  max: 20,
  step: 1,
} as const
export const DEFAULT_REALTIME_STRESS_TEST_OPTIONS = {
  count: 250,
  batchSize: 25,
  intervalMs: 40,
  updateRounds: 0,
  replaceExisting: true,
} as const

export const GALAXY_COLORS = [
  { token: 'cyber-cyan', label: 'Cyber Cyan', hex: '#38F6FF', glow: '#9AFDFF', trail: '#53D9FF' },
  { token: 'plasma-blue', label: 'Plasma Blue', hex: '#4A7DFF', glow: '#8AB2FF', trail: '#5CC8FF' },
  { token: 'ion-indigo', label: 'Ion Indigo', hex: '#646CFF', glow: '#A5A7FF', trail: '#6D8DFF' },
  { token: 'quantum-violet', label: 'Quantum Violet', hex: '#8B5CFF', glow: '#C9A8FF', trail: '#A981FF' },
  { token: 'nova-pink', label: 'Nova Pink', hex: '#FF4FD8', glow: '#FF9FEC', trail: '#FF7BE9' },
  { token: 'laser-red', label: 'Laser Red', hex: '#FF5876', glow: '#FF9DAA', trail: '#FF7F90' },
  { token: 'solar-orange', label: 'Solar Orange', hex: '#FF7A3C', glow: '#FFB088', trail: '#FF9A5F' },
  { token: 'reactor-amber', label: 'Reactor Amber', hex: '#FFB428', glow: '#FFD37A', trail: '#FFC857' },
  { token: 'acid-lime', label: 'Acid Lime', hex: '#CEFF35', glow: '#E7FF91', trail: '#CBFF66' },
  { token: 'toxic-green', label: 'Toxic Green', hex: '#56FF89', glow: '#9BFFBA', trail: '#63FFC6' },
  { token: 'pulse-teal', label: 'Pulse Teal', hex: '#28FFC8', glow: '#8DFFE4', trail: '#4BFFD8' },
  { token: 'frost-white', label: 'Frost White', hex: '#E9FBFF', glow: '#FFFFFF', trail: '#A8E9FF' },
] as const

export type ColorToken = typeof GALAXY_COLORS[number]['token']
export const COLOR_TOKENS = [
  'cyber-cyan',
  'plasma-blue',
  'ion-indigo',
  'quantum-violet',
  'nova-pink',
  'laser-red',
  'solar-orange',
  'reactor-amber',
  'acid-lime',
  'toxic-green',
  'pulse-teal',
  'frost-white',
] as const satisfies readonly ColorToken[]

export interface GalaxyUserSummary {
  id: string
  githubId: string
  login: string
  name: string | null
  avatarUrl: string
  bio: string | null
  location: string | null
  profileUrl: string
}

export interface GalaxyProfileRecord {
  id: string
  userId: string
  seed: number
  bodyType: BodyType
  orbitDistance: number
  orbitSpeed: number
  colorToken: ColorToken
  updatedAt: Date | string | null
  interactive?: boolean
  user: GalaxyUserSummary
}

export type GalaxySceneBody = GalaxyProfileRecord

export interface GalaxySceneBodyDerived {
  displayOrbitDistance: number
  scale: number
  tilt: number
  orbitRotation: [number, number, number]
  colorHex: string
  glowHex: string
  trailHex: string
}

export interface GalaxySceneBodyColors {
  hex: string
  glow: string
  trail: string
}

export interface CelestialDraft {
  bodyType: BodyType
  orbitDistance: number
  orbitSpeed: number
  colorToken: ColorToken
}

export interface RealtimeStressTestOptions {
  count: number
  batchSize: number
  intervalMs: number
  updateRounds: number
  replaceExisting: boolean
}

export interface RealtimeStressTestStatus {
  syntheticUserCount: number
  syntheticProfileCount: number
}

export interface RealtimeStressTestResult extends RealtimeStressTestStatus {
  runId: string
  insertedUsers: number
  insertedProfiles: number
  updatedUsers: number
  updatedProfiles: number
  clearedUsers: number
  clearedProfiles: number
  batchCount: number
  updateRounds: number
  durationMs: number
}

export const BODY_TYPE_META: Record<BodyType, { label: string, description: string, flavor: string }> = {
  planet: {
    label: 'Planet',
    description: 'Dense, atmospheric world with a luminous rim and stable silhouette.',
    flavor: 'Heavy mass with no life signs',
  },
  asteroid: {
    label: 'Asteroid',
    description: 'Jagged mineral body with a hard neon edge and irregular spin.',
    flavor: 'Ore-rich rogue shard',
  },
  station: {
    label: 'Station',
    description: 'Engineered orbital structure with a bright core and rigid geometry.',
    flavor: 'Civic relay platform',
  },
  comet: {
    label: 'Comet',
    description: 'Fast moving ice-and-dust nucleus with an energized tail.',
    flavor: 'Transient deep-space visitor',
  },
  spaceship: {
    label: 'Space Ship',
    description: 'Fast personal craft with a narrow hull, hot engines, and a sharp forward profile.',
    flavor: 'Destroyer-class cruiser',
  },
  saucer: {
    label: 'Saucer',
    description: 'Disc-shaped craft with a soft glow and broad silhouette built for silent gliding.',
    flavor: 'Orbital survey disc',
  },
  spacewhale: {
    label: 'Space Whale',
    description: 'Immense living drifter with a luminous body, sweeping fins, and a slow majestic outline.',
    flavor: 'Deep-void leviathan',
  },
}

export function isBodyType(value: unknown): value is BodyType {
  return typeof value === 'string' && BODY_TYPES.includes(value as BodyType)
}

export function isColorToken(value: unknown): value is ColorToken {
  return typeof value === 'string' && COLOR_TOKENS.includes(value as ColorToken)
}

export function isRealtimeStressLogin(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(REALTIME_STRESS_LOGIN_PREFIX)
}

export function isRealtimeStressGithubId(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(REALTIME_STRESS_GITHUB_ID_PREFIX)
}

const colorDefinitionCache = new Map(GALAXY_COLORS.map(color => [color.token, color] as const))

export function getColorDefinition(token: ColorToken) {
  return colorDefinitionCache.get(token) ?? GALAXY_COLORS[0]
}

export function clampOrbitDistance(value: number) {
  if (!Number.isFinite(value)) {
    return ORBIT_DISTANCE_RANGE.min
  }

  return Math.min(ORBIT_DISTANCE_RANGE.max, Math.max(ORBIT_DISTANCE_RANGE.min, Math.round(value)))
}

function normalizeOrbitSpeedUnits(value: number) {
  if (!Number.isFinite(value)) {
    return ORBIT_SPEED_RANGE.min
  }

  if (Math.abs(value) <= ORBIT_SPEED_MULTIPLIER_RANGE.max) {
    return value * ORBIT_SPEED_MULTIPLIER_SCALE
  }

  return value
}

export function clampOrbitSpeed(value: number) {
  const normalized = normalizeOrbitSpeedUnits(value)
  const rounded = Math.round(normalized / ORBIT_SPEED_RANGE.step) * ORBIT_SPEED_RANGE.step
  return Math.min(ORBIT_SPEED_RANGE.max, Math.max(ORBIT_SPEED_RANGE.min, rounded))
}

export function orbitSpeedToMultiplier(value: number) {
  return clampOrbitSpeed(value) / ORBIT_SPEED_MULTIPLIER_SCALE
}

export function getOrbitAngularSpeed(value: number | undefined) {
  return orbitSpeedToMultiplier(value ?? 0) * ORBIT_ANGULAR_SPEED_FACTOR
}

export function getOrbitLinearSpeed(distance: number | undefined, speed: number | undefined) {
  return clampOrbitDistance(distance ?? 0) * getOrbitAngularSpeed(speed)
}

const ORBIT_VERTICAL_TILT_CLAMP_RATIO = 0.15
const MAX_ORBIT_VERTICAL_TILT = (Math.PI / 2) * ORBIT_VERTICAL_TILT_CLAMP_RATIO

export function hashStringToSeed(input: string) {
  let hash = 0

  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0
  }

  return Math.abs(hash)
}

export function buildDefaultCelestialProfile(userId: string, seed: number) {
  const bodyType = BODY_TYPES[seed % BODY_TYPES.length]!
  const colorToken = COLOR_TOKENS[seed % COLOR_TOKENS.length]!
  const orbitDistanceSpan = ORBIT_DISTANCE_RANGE.max - ORBIT_DISTANCE_RANGE.min
  const orbitDistance = clampOrbitDistance(ORBIT_DISTANCE_RANGE.min + (seed % (orbitDistanceSpan + 1)))
  const orbitSpeedSteps = Math.round((ORBIT_SPEED_RANGE.max - ORBIT_SPEED_RANGE.min) / ORBIT_SPEED_RANGE.step)
  const orbitSpeed = clampOrbitSpeed(ORBIT_SPEED_RANGE.min + ((seed >>> 3) % (orbitSpeedSteps + 1)) * ORBIT_SPEED_RANGE.step)

  return {
    userId,
    seed,
    bodyType,
    orbitDistance,
    orbitSpeed,
    colorToken,
    updatedAt: new Date(),
  }
}

export function createDraftFromProfile(profile: GalaxyProfileRecord): CelestialDraft {
  return {
    bodyType: profile.bodyType,
    orbitDistance: clampOrbitDistance(profile.orbitDistance),
    orbitSpeed: clampOrbitSpeed(profile.orbitSpeed),
    colorToken: profile.colorToken,
  }
}

export function getBodyTypeLabel(bodyType: BodyType) {
  return BODY_TYPE_META[bodyType].label
}

export function formatOrbitDistance(value: number | undefined) {
  return `${clampOrbitDistance(value ?? 0)} au`
}

export function formatOrbitSpeed(value: number | undefined) {
  return `${orbitSpeedToMultiplier(value ?? 0).toFixed(2)}x`
}

export function formatOrbitLinearSpeed(distance: number | undefined, speed: number | undefined) {
  return `${getOrbitLinearSpeed(distance, speed).toFixed(2)} au/s`
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6D2B79F5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function getScaleBoost(bodyType: BodyType) {
  switch (bodyType) {
    case 'station':
      return 0.08
    case 'saucer':
      return 0.05
    case 'spaceship':
      return 0.03
    case 'spacewhale':
      return 0.22
    default:
      return 0
  }
}

function getScaleMultiplier(bodyType: BodyType) {
  switch (bodyType) {
    case 'planet':
      return 1.4
    case 'saucer':
    case 'spaceship':
    case 'spacewhale':
      return 0.7
    default:
      return 1
  }
}

interface SceneBodyMetricsCache extends GalaxySceneBodyDerived {
  bodyType: BodyType
  colorToken: ColorToken
  orbitDistance: number
  orbitSpeed: number
  seed: number
}

interface SceneBodyNumberSample {
  elapsed: number
  value: number
}

interface SceneBodyPositionSample {
  elapsed: number
  value: [number, number, number]
}

interface SceneBodyOrbitAngleCache {
  orbitSpeed: number
  seed: number
  samples: SceneBodyNumberSample[]
}

interface SceneBodyWobbleCache {
  seed: number
  samples: SceneBodyNumberSample[]
}

interface SceneBodyPositionCache {
  orbitDistance: number
  orbitSpeed: number
  seed: number
  samples: SceneBodyPositionSample[]
}

const sceneBodyMetricsCache = new WeakMap<GalaxySceneBody, SceneBodyMetricsCache>()
const orbitRotationCache = new Map<number, [number, number, number]>()
const sceneBodyOrbitAngleCache = new WeakMap<object, SceneBodyOrbitAngleCache>()
const sceneBodyWobbleCache = new WeakMap<object, SceneBodyWobbleCache>()
const sceneBodyPositionCache = new WeakMap<object, SceneBodyPositionCache>()

function getSampleValue<T>(samples: Array<{ elapsed: number, value: T }>, elapsed: number) {
  for (const sample of samples) {
    if (sample.elapsed === elapsed) {
      return sample.value
    }
  }

  return null
}

function setSampleValue<T>(samples: Array<{ elapsed: number, value: T }>, elapsed: number, value: T, limit = 2) {
  samples.unshift({ elapsed, value })

  if (samples.length > limit) {
    samples.length = limit
  }

  return value
}

function getSceneBodyOrbitAngleSamples(body: Pick<GalaxySceneBody, 'orbitSpeed' | 'seed'>) {
  const orbitSpeed = Number(body.orbitSpeed)
  const seed = body.seed
  const cached = sceneBodyOrbitAngleCache.get(body as object)

  if (cached && cached.orbitSpeed === orbitSpeed && cached.seed === seed) {
    return cached.samples
  }

  const samples: SceneBodyNumberSample[] = []
  sceneBodyOrbitAngleCache.set(body as object, {
    orbitSpeed,
    seed,
    samples,
  })
  return samples
}

function getSceneBodyWobbleSamples(body: Pick<GalaxySceneBody, 'seed'>) {
  const seed = body.seed
  const cached = sceneBodyWobbleCache.get(body as object)

  if (cached && cached.seed === seed) {
    return cached.samples
  }

  const samples: SceneBodyNumberSample[] = []
  sceneBodyWobbleCache.set(body as object, {
    seed,
    samples,
  })
  return samples
}

function getSceneBodyPositionSamples(body: Pick<GalaxySceneBody, 'orbitDistance' | 'orbitSpeed' | 'seed'>) {
  const orbitDistance = Number(body.orbitDistance)
  const orbitSpeed = Number(body.orbitSpeed)
  const seed = body.seed
  const cached = sceneBodyPositionCache.get(body as object)

  if (
    cached
    && cached.orbitDistance === orbitDistance
    && cached.orbitSpeed === orbitSpeed
    && cached.seed === seed
  ) {
    return cached.samples
  }

  const samples: SceneBodyPositionSample[] = []
  sceneBodyPositionCache.set(body as object, {
    orbitDistance,
    orbitSpeed,
    seed,
    samples,
  })
  return samples
}

export function getSceneBodyOrbitRotation(seed: number): [number, number, number]
export function getSceneBodyOrbitRotation(body: Pick<GalaxySceneBody, 'seed'>): [number, number, number]
export function getSceneBodyOrbitRotation(seedOrBody: number | Pick<GalaxySceneBody, 'seed'>): [number, number, number] {
  const seed = typeof seedOrBody === 'number' ? seedOrBody : seedOrBody.seed
  const cachedRotation = orbitRotationCache.get(seed)

  if (cachedRotation) {
    return cachedRotation
  }

  const random = createSeededRandom(seed ^ 0x9E3779B9)
  const rotation: [number, number, number] = [
    (random() * 2 - 1) * MAX_ORBIT_VERTICAL_TILT,
    random() * Math.PI * 2,
    (random() * 2 - 1) * MAX_ORBIT_VERTICAL_TILT,
  ]

  orbitRotationCache.set(seed, rotation)
  return rotation
}

function getSceneBodyMetrics(body: GalaxySceneBody) {
  const orbitDistance = Number(body.orbitDistance)
  const orbitSpeed = Number(body.orbitSpeed)
  const seed = body.seed
  const cachedMetrics = sceneBodyMetricsCache.get(body)

  if (
    cachedMetrics
    && cachedMetrics.bodyType === body.bodyType
    && cachedMetrics.colorToken === body.colorToken
    && cachedMetrics.orbitDistance === orbitDistance
    && cachedMetrics.orbitSpeed === orbitSpeed
    && cachedMetrics.seed === seed
  ) {
    return cachedMetrics
  }

  const scaleBoost = getScaleBoost(body.bodyType)
  const scaleMultiplier = getScaleMultiplier(body.bodyType)
  const scale = (0.4 + (seed % 5) * 0.075 + scaleBoost) * scaleMultiplier
  const color = getColorDefinition(body.colorToken)
  const metrics: SceneBodyMetricsCache = {
    bodyType: body.bodyType,
    colorToken: body.colorToken,
    orbitDistance,
    orbitSpeed,
    seed,
    displayOrbitDistance: orbitDistance,
    scale,
    tilt: (seed % 12) * 0.04,
    orbitRotation: getSceneBodyOrbitRotation(seed),
    colorHex: color.hex,
    glowHex: color.glow,
    trailHex: color.trail,
  }

  sceneBodyMetricsCache.set(body, metrics)
  return metrics
}

export function getSceneBodyDisplayOrbitDistance(body: Pick<GalaxySceneBody, 'orbitDistance'>) {
  return Number(body.orbitDistance)
}

export function getSceneBodyScale(body: GalaxySceneBody) {
  return getSceneBodyMetrics(body).scale
}

export function getSceneBodyTilt(body: GalaxySceneBody) {
  return getSceneBodyMetrics(body).tilt
}

export function getSceneBodyColors(body: GalaxySceneBody): GalaxySceneBodyColors {
  const metrics = getSceneBodyMetrics(body)

  return {
    hex: metrics.colorHex,
    glow: metrics.glowHex,
    trail: metrics.trailHex,
  }
}

export function getSceneBodyColorHex(body: GalaxySceneBody) {
  return getSceneBodyMetrics(body).colorHex
}

export function getSceneBodyGlowHex(body: GalaxySceneBody) {
  return getSceneBodyMetrics(body).glowHex
}

export function getSceneBodyTrailHex(body: GalaxySceneBody) {
  return getSceneBodyMetrics(body).trailHex
}

export function getSceneBodyOrbitAngle(body: Pick<GalaxySceneBody, 'orbitSpeed' | 'seed'>, elapsed: number) {
  const samples = getSceneBodyOrbitAngleSamples(body)
  const cachedOrbitAngle = getSampleValue(samples, elapsed)

  if (cachedOrbitAngle != null) {
    return cachedOrbitAngle
  }

  return setSampleValue(
    samples,
    elapsed,
    elapsed * getOrbitAngularSpeed(Number(body.orbitSpeed)) + ((body.seed % 360) * Math.PI / 180),
  )
}

export function getSceneBodyWobble(body: Pick<GalaxySceneBody, 'seed'>, elapsed: number) {
  const samples = getSceneBodyWobbleSamples(body)
  const cachedWobble = getSampleValue(samples, elapsed)

  if (cachedWobble != null) {
    return cachedWobble
  }

  return setSampleValue(samples, elapsed, Math.sin(elapsed * 0.35 + body.seed) * 0.14)
}

function rotatePointByOrbitRotation(
  x: number,
  y: number,
  z: number,
  orbitRotation: [number, number, number],
): [number, number, number] {
  const [rotationX, rotationY, rotationZ] = orbitRotation
  const cosX = Math.cos(rotationX)
  const sinX = Math.sin(rotationX)
  const cosY = Math.cos(rotationY)
  const sinY = Math.sin(rotationY)
  const cosZ = Math.cos(rotationZ)
  const sinZ = Math.sin(rotationZ)

  const rotatedX = x
  const rotatedY = y * cosX - z * sinX
  const rotatedZ = y * sinX + z * cosX

  const tiltedX = rotatedX * cosY + rotatedZ * sinY
  const tiltedY = rotatedY
  const tiltedZ = -rotatedX * sinY + rotatedZ * cosY

  return [
    tiltedX * cosZ - tiltedY * sinZ,
    tiltedX * sinZ + tiltedY * cosZ,
    tiltedZ,
  ]
}

export function getSceneBodyPosition(body: Pick<GalaxySceneBody, 'orbitDistance' | 'orbitSpeed' | 'seed'>, elapsed: number): [number, number, number] {
  const samples = getSceneBodyPositionSamples(body)
  const cachedPosition = getSampleValue(samples, elapsed)

  if (cachedPosition) {
    return cachedPosition
  }

  const orbitAngle = getSceneBodyOrbitAngle(body, elapsed)
  const orbitDistance = Number(body.orbitDistance)

  return setSampleValue(
    samples,
    elapsed,
    rotatePointByOrbitRotation(
      Math.cos(orbitAngle) * orbitDistance,
      Math.sin(elapsed * 0.8 + body.seed * 0.21) * 0.45,
      Math.sin(orbitAngle) * orbitDistance,
      getSceneBodyOrbitRotation(body),
    ),
  )
}
