import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { RealtimeStressTestOptions, RealtimeStressTestStatus } from '~~/shared/galaxy'
import { count, eq, inArray, like } from 'drizzle-orm'
import { celestialProfiles, users } from '~~/server/database/schema'
import { useDrizzle } from '~~/server/utils/drizzle'
import {
  BODY_TYPES,
  buildDefaultCelestialProfile,
  clampOrbitDistance,
  clampOrbitSpeed,
  COLOR_TOKENS,
  DEFAULT_REALTIME_STRESS_TEST_OPTIONS,
  hashStringToSeed,
  ORBIT_DISTANCE_RANGE,
  ORBIT_SPEED_RANGE,
  REALTIME_STRESS_BATCH_SIZE_RANGE,
  REALTIME_STRESS_COUNT_RANGE,
  REALTIME_STRESS_GITHUB_ID_PREFIX,
  REALTIME_STRESS_INTERVAL_RANGE,
  REALTIME_STRESS_LOGIN_PREFIX,
  REALTIME_STRESS_UPDATE_ROUNDS_RANGE,
} from '~~/shared/galaxy'

type Db = ReturnType<typeof useDrizzle>
type UserRecord = InferSelectModel<typeof users>
type CelestialProfileRecord = InferSelectModel<typeof celestialProfiles>
interface SyntheticRealtimeEntry {
  ordinal: number
  user: UserRecord
  profile: CelestialProfileRecord
}

export interface RealtimeStressCreatedRecord {
  collection: 'users' | 'celestialProfiles'
  record: UserRecord | CelestialProfileRecord
}

export interface RealtimeStressDeletedRecord {
  collection: 'users' | 'celestialProfiles'
  key: string
  record: UserRecord | CelestialProfileRecord
}

export interface RealtimeStressUpdatedRecord {
  collection: 'users' | 'celestialProfiles'
  key: string
  record: UserRecord | CelestialProfileRecord
}

export interface RealtimeStressClearResult {
  clearedUsers: number
  clearedProfiles: number
}

export interface RealtimeStressRunResult extends RealtimeStressClearResult {
  runId: string
  insertedUsers: number
  insertedProfiles: number
  updatedUsers: number
  updatedProfiles: number
  batchCount: number
  updateRounds: number
  durationMs: number
  status: RealtimeStressTestStatus
}

const DELETE_BATCH_SIZE = 200

export function assertRealtimeStressTestingEnabled() {
  if (!import.meta.dev) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Realtime stress testing is only enabled in development.',
    })
  }
}

export function normalizeRealtimeStressTestOptions(input: Partial<RealtimeStressTestOptions> | null | undefined): RealtimeStressTestOptions {
  return {
    count: clampWholeNumber(input?.count, REALTIME_STRESS_COUNT_RANGE.min, REALTIME_STRESS_COUNT_RANGE.max, DEFAULT_REALTIME_STRESS_TEST_OPTIONS.count),
    batchSize: clampWholeNumber(input?.batchSize, REALTIME_STRESS_BATCH_SIZE_RANGE.min, REALTIME_STRESS_BATCH_SIZE_RANGE.max, DEFAULT_REALTIME_STRESS_TEST_OPTIONS.batchSize),
    intervalMs: clampWholeNumber(input?.intervalMs, REALTIME_STRESS_INTERVAL_RANGE.min, REALTIME_STRESS_INTERVAL_RANGE.max, DEFAULT_REALTIME_STRESS_TEST_OPTIONS.intervalMs),
    updateRounds: clampWholeNumber(input?.updateRounds, REALTIME_STRESS_UPDATE_ROUNDS_RANGE.min, REALTIME_STRESS_UPDATE_ROUNDS_RANGE.max, DEFAULT_REALTIME_STRESS_TEST_OPTIONS.updateRounds),
    replaceExisting: typeof input?.replaceExisting === 'boolean'
      ? input.replaceExisting
      : DEFAULT_REALTIME_STRESS_TEST_OPTIONS.replaceExisting,
  }
}

export async function getRealtimeStressTestStatus(db: Db = useDrizzle()): Promise<RealtimeStressTestStatus> {
  const [userCounts, profileCounts] = await Promise.all([
    db.select({ value: count() })
      .from(users)
      .where(like(users.githubId, `${REALTIME_STRESS_GITHUB_ID_PREFIX}%`)),
    db.select({ value: count() })
      .from(celestialProfiles)
      .innerJoin(users, eq(celestialProfiles.userId, users.id))
      .where(like(users.githubId, `${REALTIME_STRESS_GITHUB_ID_PREFIX}%`)),
  ])

  return {
    syntheticUserCount: Number(userCounts[0]?.value ?? 0),
    syntheticProfileCount: Number(profileCounts[0]?.value ?? 0),
  }
}

export async function clearRealtimeStressTestData(
  onDelete: (payload: RealtimeStressDeletedRecord) => Promise<void>,
  db: Db = useDrizzle(),
): Promise<RealtimeStressClearResult> {
  const syntheticUsers = await db.select({ id: users.id })
    .from(users)
    .where(like(users.githubId, `${REALTIME_STRESS_GITHUB_ID_PREFIX}%`))

  if (syntheticUsers.length === 0) {
    return {
      clearedUsers: 0,
      clearedProfiles: 0,
    }
  }

  let clearedUsers = 0
  let clearedProfiles = 0

  for (const userIds of chunkArray(syntheticUsers.map(user => user.id), DELETE_BATCH_SIZE)) {
    const { deletedProfiles, deletedUsers } = await db.transaction(async (tx) => {
      const deletedProfiles = await tx.delete(celestialProfiles)
        .where(inArray(celestialProfiles.userId, userIds))
        .returning()
      const deletedUsers = await tx.delete(users)
        .where(inArray(users.id, userIds))
        .returning()

      return {
        deletedProfiles,
        deletedUsers,
      }
    })

    for (const profile of deletedProfiles) {
      await onDelete({
        collection: 'celestialProfiles',
        key: profile.id,
        record: profile,
      })
    }

    for (const user of deletedUsers) {
      await onDelete({
        collection: 'users',
        key: user.id,
        record: user,
      })
    }

    clearedProfiles += deletedProfiles.length
    clearedUsers += deletedUsers.length
  }

  return {
    clearedUsers,
    clearedProfiles,
  }
}

export async function runRealtimeStressTest(
  options: Partial<RealtimeStressTestOptions> | RealtimeStressTestOptions | null | undefined,
  publishCreated: (payload: RealtimeStressCreatedRecord) => Promise<void>,
  publishUpdated: (payload: RealtimeStressUpdatedRecord) => Promise<void>,
  publishDeleted: (payload: RealtimeStressDeletedRecord) => Promise<void>,
  db: Db = useDrizzle(),
): Promise<RealtimeStressRunResult> {
  const normalizedOptions = normalizeRealtimeStressTestOptions(options)
  const startedAt = Date.now()
  let clearedUsers = 0
  let clearedProfiles = 0

  if (normalizedOptions.replaceExisting) {
    const cleared = await clearRealtimeStressTestData(publishDeleted, db)
    clearedUsers = cleared.clearedUsers
    clearedProfiles = cleared.clearedProfiles
  }

  const batchCount = Math.ceil(normalizedOptions.count / normalizedOptions.batchSize)
  const runId = createRunId()
  let insertedUsers = 0
  let insertedProfiles = 0
  let updatedUsers = 0
  let updatedProfiles = 0
  const createdUserRecords: UserRecord[] = []
  const createdProfileRecords: CelestialProfileRecord[] = []

  for (let offset = 0; offset < normalizedOptions.count; offset += normalizedOptions.batchSize) {
    const batchLength = Math.min(normalizedOptions.batchSize, normalizedOptions.count - offset)
    const syntheticUsers = buildSyntheticUsers(runId, offset, batchLength, normalizedOptions.batchSize)
    const { createdUsers, createdProfiles } = await db.transaction(async (tx) => {
      const createdUsers = await tx.insert(users)
        .values(syntheticUsers)
        .returning()
      const createdProfiles = await tx.insert(celestialProfiles)
        .values(createdUsers.map(user => buildSyntheticProfile(user)))
        .returning()

      return {
        createdUsers,
        createdProfiles,
      }
    })

    for (const user of createdUsers) {
      await publishCreated({
        collection: 'users',
        record: user,
      })
    }

    for (const profile of createdProfiles) {
      await publishCreated({
        collection: 'celestialProfiles',
        record: profile,
      })
    }

    insertedUsers += createdUsers.length
    insertedProfiles += createdProfiles.length
    createdUserRecords.push(...createdUsers)
    createdProfileRecords.push(...createdProfiles)

    if (normalizedOptions.intervalMs > 0 && offset + batchLength < normalizedOptions.count) {
      await sleep(normalizedOptions.intervalMs)
    }
  }

  if (normalizedOptions.updateRounds > 0 && createdUserRecords.length > 0) {
    const profileEntries = createdProfileRecords.map((profile) => {
      return [profile.userId, profile] as const
    })
    const profilesByUserId = new Map<string, CelestialProfileRecord>(profileEntries)
    let syntheticEntries = createdUserRecords.reduce<SyntheticRealtimeEntry[]>((entries, user, index) => {
      const profile = profilesByUserId.get(user.id)

      if (!profile) {
        return entries
      }

      entries.push({
        ordinal: index + 1,
        user,
        profile,
      })

      return entries
    }, [])

    for (let round = 1; round <= normalizedOptions.updateRounds; round += 1) {
      const nextEntries = [...syntheticEntries]

      for (let offset = 0; offset < syntheticEntries.length; offset += normalizedOptions.batchSize) {
        const batchEntries = syntheticEntries.slice(offset, offset + normalizedOptions.batchSize)
        const updateTimestamp = new Date(Date.now() + round * 10_000 + offset)
        const updatedBatch = await db.transaction(async (tx) => {
          const updatedUsers: UserRecord[] = []
          const updatedProfiles: CelestialProfileRecord[] = []

          for (const entry of batchEntries) {
            const [updatedUser] = await tx.update(users)
              .set(buildSyntheticUserUpdate(entry.ordinal, round, updateTimestamp))
              .where(eq(users.id, entry.user.id))
              .returning()
            const [updatedProfile] = await tx.update(celestialProfiles)
              .set(buildSyntheticProfileUpdate(entry.user, entry.profile, entry.ordinal, round, updateTimestamp))
              .where(eq(celestialProfiles.id, entry.profile.id))
              .returning()

            if (updatedUser) {
              updatedUsers.push(updatedUser)
            }

            if (updatedProfile) {
              updatedProfiles.push(updatedProfile)
            }
          }

          return {
            updatedUsers,
            updatedProfiles,
          }
        })

        for (const user of updatedBatch.updatedUsers) {
          await publishUpdated({
            collection: 'users',
            key: user.id,
            record: user,
          })
        }

        for (const profile of updatedBatch.updatedProfiles) {
          await publishUpdated({
            collection: 'celestialProfiles',
            key: profile.id,
            record: profile,
          })
        }

        updatedUsers += updatedBatch.updatedUsers.length
        updatedProfiles += updatedBatch.updatedProfiles.length

        for (let batchIndex = 0; batchIndex < batchEntries.length; batchIndex += 1) {
          const currentEntry = batchEntries[batchIndex]
          const updatedUser = updatedBatch.updatedUsers[batchIndex]
          const updatedProfile = updatedBatch.updatedProfiles[batchIndex]

          if (!currentEntry || !updatedUser || !updatedProfile) {
            continue
          }

          nextEntries[offset + batchIndex] = {
            ...currentEntry,
            user: updatedUser,
            profile: updatedProfile,
          }
        }

        if (normalizedOptions.intervalMs > 0 && (offset + batchEntries.length < syntheticEntries.length || round < normalizedOptions.updateRounds)) {
          await sleep(normalizedOptions.intervalMs)
        }
      }

      syntheticEntries = nextEntries
    }
  }

  return {
    runId,
    insertedUsers,
    insertedProfiles,
    updatedUsers,
    updatedProfiles,
    clearedUsers,
    clearedProfiles,
    batchCount,
    updateRounds: normalizedOptions.updateRounds,
    durationMs: Date.now() - startedAt,
    status: await getRealtimeStressTestStatus(db),
  }
}

function clampWholeNumber(value: unknown, min: number, max: number, fallback: number) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)))
}

function createRunId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function buildSyntheticUsers(runId: string, offset: number, batchLength: number, batchSize: number): InferInsertModel<typeof users>[] {
  return Array.from({ length: batchLength }, (_, index) => {
    const ordinal = offset + index + 1
    const githubId = `${REALTIME_STRESS_GITHUB_ID_PREFIX}${runId}-${ordinal}`
    const login = `${REALTIME_STRESS_LOGIN_PREFIX}${runId}-${String(ordinal).padStart(4, '0')}`
    const timestamp = new Date(Date.now() + ordinal)
    const batchNumber = Math.floor(offset / Math.max(1, batchSize)) + 1

    return {
      githubId,
      login,
      name: `Synthetic Pilot ${ordinal}`,
      avatarUrl: '/logo.png',
      bio: 'Synthetic stress-test user inserted by the server to load the realtime pipeline.',
      location: `Stress batch ${batchNumber}`,
      profileUrl: '/',
      createdAt: timestamp,
      updatedAt: timestamp,
      lastLoginAt: timestamp,
    }
  })
}

function buildSyntheticProfile(user: UserRecord): InferInsertModel<typeof celestialProfiles> {
  const profile = buildDefaultCelestialProfile(user.id, hashStringToSeed(user.githubId))

  return {
    ...profile,
    updatedAt: user.updatedAt,
  }
}

function buildSyntheticUserUpdate(
  ordinal: number,
  round: number,
  updatedAt: Date,
): Pick<InferInsertModel<typeof users>, 'bio' | 'location' | 'updatedAt'> {
  return {
    bio: `Synthetic pilot ${ordinal} broadcasting realtime profile update wave ${round}.`,
    location: `Update wave ${round} - lane ${(ordinal % 9) + 1}`,
    updatedAt,
  }
}

function buildSyntheticProfileUpdate(
  user: UserRecord,
  profile: CelestialProfileRecord,
  ordinal: number,
  round: number,
  updatedAt: Date,
): Pick<InferInsertModel<typeof celestialProfiles>, 'bodyType' | 'orbitDistance' | 'orbitSpeed' | 'colorToken' | 'updatedAt'> {
  const updateSeed = hashStringToSeed(`${user.githubId}:${profile.id}:${round}:${ordinal}`)
  const orbitDistanceSpan = ORBIT_DISTANCE_RANGE.max - ORBIT_DISTANCE_RANGE.min
  const orbitSpeedSteps = Math.round((ORBIT_SPEED_RANGE.max - ORBIT_SPEED_RANGE.min) / ORBIT_SPEED_RANGE.step)

  return {
    bodyType: BODY_TYPES[updateSeed % BODY_TYPES.length]!,
    orbitDistance: clampOrbitDistance(ORBIT_DISTANCE_RANGE.min + (updateSeed % (orbitDistanceSpan + 1))),
    orbitSpeed: clampOrbitSpeed(ORBIT_SPEED_RANGE.min + ((updateSeed >>> 3) % (orbitSpeedSteps + 1)) * ORBIT_SPEED_RANGE.step),
    colorToken: COLOR_TOKENS[(updateSeed >>> 1) % COLOR_TOKENS.length]!,
    updatedAt,
  }
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function sleep(durationMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs)
  })
}
