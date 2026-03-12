import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { celestialProfiles, users } from '~~/server/database/schema'
import { useDrizzle } from '~~/server/utils/drizzle'
import { BODY_TYPES, clampOrbitDistance, clampOrbitSpeed, COLOR_TOKENS } from '~~/shared/galaxy'

type MutableRecord = Record<string, unknown>

function denyMutation(statusMessage: string) {
  return () => {
    throw createError({
      statusCode: 403,
      statusMessage,
    })
  }
}

function assertPatchBody(body: unknown): asserts body is MutableRecord {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid payload.',
    })
  }
}

function buildSafeProfilePatch(body: MutableRecord) {
  const safePatch: MutableRecord = {}

  if (typeof body.bodyType === 'string') {
    if (!BODY_TYPES.includes(body.bodyType as typeof BODY_TYPES[number])) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Unknown body type.',
      })
    }

    safePatch.bodyType = body.bodyType
  }

  if (body.orbitDistance != null) {
    safePatch.orbitDistance = clampOrbitDistance(Number(body.orbitDistance))
  }

  if (body.orbitSpeed != null) {
    safePatch.orbitSpeed = clampOrbitSpeed(Number(body.orbitSpeed))
  }

  if (typeof body.colorToken === 'string') {
    if (!COLOR_TOKENS.includes(body.colorToken as typeof COLOR_TOKENS[number])) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Unknown color token.',
      })
    }

    safePatch.colorToken = body.colorToken
  }

  if (Object.keys(safePatch).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No editable fields were provided.',
    })
  }

  return safePatch
}

function replaceRecordContents(target: MutableRecord, nextValue: MutableRecord) {
  Object.keys(target).forEach((key) => {
    delete target[key]
  })

  Object.assign(target, nextValue)
}

export default defineNitroPlugin(() => {
  // Only the two educational tables are publicly queryable through generated routes.
  allowTables([users, celestialProfiles])

  hooksForTable(users, {
    'index.post.before': denyMutation('Users are synchronized from GitHub login only.'),
    'item.patch.before': denyMutation('Users cannot be changed through the public API.'),
    'item.delete.before': denyMutation('Users cannot be deleted through the public API.'),
  })

  hooksForTable(celestialProfiles, {
    'index.post.before': denyMutation('Celestial profiles are created automatically during login.'),
    'item.delete.before': denyMutation('Celestial profiles cannot be deleted.'),
    'item.patch.before': async (payload) => {
      const db = useDrizzle()
      const { user: { id: userId } } = await requireUserSession(payload.event)
      const body = payload.body

      assertPatchBody(body)
      const safePatch = buildSafeProfilePatch(body)

      const ownedProfile = await db.query.celestialProfiles.findFirst({
        columns: {
          id: true,
        },
        where: and(
          eq(celestialProfiles.id, payload.key),
          eq(celestialProfiles.userId, userId),
        ),
      })

      if (!ownedProfile) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You can only edit your own orbital object.',
        })
      }

      // The generated handler uses payload.body afterwards, so we replace it with
      // the sanitized subset instead of trusting the original client payload.
      replaceRecordContents(body, {
        ...safePatch,
        updatedAt: new Date(),
      })

      payload.transformQuery(({ where }) => {
        where(eq(celestialProfiles.userId, userId))
      })
    },
  })

  rstoreDrizzleHooks.hook('realtime.filter', ({ collection, reject }) => {
    if (collection !== 'users' && collection !== 'celestialProfiles') {
      reject()
    }
  })
})
