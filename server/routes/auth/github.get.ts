import { eq } from 'drizzle-orm'
import { sendRedirect } from 'h3'
import { celestialProfiles, users } from '~~/server/database/schema'
import * as schema from '~~/server/database/schema'
import { useDrizzle } from '~~/server/utils/drizzle'
import { buildDefaultCelestialProfile, hashStringToSeed } from '~~/shared/galaxy'

export default defineOAuthGitHubEventHandler({
  config: {
    emailRequired: false,
  },
  async onSuccess(event, { user }) {
    const db = useDrizzle()
    const now = new Date()
    const githubId = String(user.id)
    const login = user.login || `github-${githubId}`
    const avatarUrl = user.avatar_url || `https://github.com/${login}.png`
    const profileUrl = user.html_url || `https://github.com/${login}`
    const seed = hashStringToSeed(githubId)

    const payload = {
      githubId,
      login,
      name: user.name ?? null,
      avatarUrl,
      bio: user.bio ?? null,
      location: user.location ?? null,
      profileUrl,
      updatedAt: now,
      lastLoginAt: now,
    }

    const existingUser = await db.query.users.findFirst({
      columns: {
        id: true,
      },
      where: eq(users.githubId, githubId),
    })

    const [dbUser] = existingUser
      ? await db.update(users)
          .set(payload)
          .where(eq(users.githubId, githubId))
          .returning()
      : await db.insert(users)
          .values({
            ...payload,
            createdAt: now,
          })
          .returning()

    if (!dbUser) {
      throw new Error('Failed to create or update user in the database.')
    }

    const existingProfile = await db.query.celestialProfiles.findFirst({
      columns: {
        id: true,
      },
      where: eq(celestialProfiles.userId, dbUser.id),
    })

    publishRstoreDrizzleRealtimeUpdate({
      collection: schema.users,
      type: existingUser ? 'updated' : 'created',
      record: dbUser,
    })

    if (!existingProfile) {
      const [profile] = await db.insert(celestialProfiles).values(buildDefaultCelestialProfile(dbUser.id, seed)).returning()

      if (!profile) {
        throw new Error('Failed to create celestial profile for the user.')
      }

      publishRstoreDrizzleRealtimeUpdate({
        collection: schema.celestialProfiles,
        type: 'created',
        record: profile,
      })
    }

    await setUserSession(event, {
      user: {
        id: dbUser.id,
        githubId,
        login: dbUser.login,
        name: dbUser.name,
        avatarUrl: dbUser.avatarUrl,
      },
      loggedInAt: now,
    })

    return sendRedirect(event, '/')
  },
  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/login?error=github_oauth')
  },
})
