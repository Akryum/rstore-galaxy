<script setup lang="ts">
import { isRealtimeStressLogin } from '~~/shared/galaxy'

type SceneProfileItem = StoreWrappedItem<'celestialProfiles'> & {
  user: StoreWrappedItem<'users'>
}

// const SCENE_QUERY_LIMIT = 1000

const store = useStore()
const route = useRoute()
const { loggedIn, user, clear } = useUserSession()

const sceneQuery = await store.celestialProfiles.liveQuery(builder =>
  builder.many({
    fetchPolicy: 'cache-and-fetch',
    params: {
      orderBy: ['updatedAt.desc'],
      // limit: SCENE_QUERY_LIMIT,
    },
    include: {
      user: true,
    },
  }),
)
function refreshSceneQuery() {
  return (sceneQuery as typeof sceneQuery & {
    refresh: () => Promise<unknown>
  }).refresh()
}

store.users.subscribe(s => s({}))

const selectedId = ref<string | null>(null)
const recenterSelectionEnabled = ref(false)
const mobileInspectorOpen = ref(false)
const orbitActionError = ref<string | null>(null)

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    clearSelection()
  }
}

const sceneItems = sceneQuery.data as Ref<SceneProfileItem[]>

const profileCount = computed(() => sceneItems.value.length)
const selectedProfile = computed(() => {
  return selectedId.value
    ? sceneItems.value.find(item => item.id === selectedId.value) ?? null
    : null
})
const currentUserProfileId = computed(() => {
  if (!loggedIn.value || !user.value?.id) {
    return null
  }

  return sceneItems.value.find(item => item.userId === user.value?.id)?.id ?? null
})
const hasSelection = computed(() => Boolean(selectedId.value))
const stressTestVisibleSyntheticProfileCount = computed(() => {
  return sceneItems.value.filter(item => isRealtimeStressLogin(item.user.login)).length
})
const selectedUserLogin = computed(() => selectedProfile.value?.user.login ?? null)
const kioskMode = computed(() => route.query.kiosk === 'true')

function clearSelection() {
  selectedId.value = null
  mobileInspectorOpen.value = false
}

if (import.meta.client) {
  watch(selectedId, (value) => {
    mobileInspectorOpen.value = Boolean(value)
  }, { immediate: true })

  watch([selectedId, sceneItems], ([nextSelectedId, nextSceneItems]) => {
    if (!nextSelectedId) {
      return
    }

    if (!nextSceneItems.some(item => item.id === nextSelectedId)) {
      clearSelection()
    }
  })

  onMounted(() => {
    window.addEventListener('keydown', handleEscape)
  })
}

onBeforeUnmount(() => {
  if (!import.meta.client) {
    return
  }

  window.removeEventListener('keydown', handleEscape)
})

async function logout() {
  await clear()
  selectedId.value = null
  mobileInspectorOpen.value = false
  orbitActionError.value = null
}

async function editOwnOrbit() {
  orbitActionError.value = null

  if (!loggedIn.value) {
    return
  }

  if (!currentUserProfileId.value) {
    await refreshSceneQuery()
  }

  if (!currentUserProfileId.value) {
    mobileInspectorOpen.value = true
    orbitActionError.value = 'Your orbit is not available yet. Refresh once the profile has been created.'
    return
  }

  selectedId.value = currentUserProfileId.value
  mobileInspectorOpen.value = true
}

const isDev = import.meta.dev
</script>

<template>
  <main class="relative min-h-screen overflow-hidden bg-transparent">
    <GalaxyScene
      :items="sceneItems"
      :selected-id="selectedId"
      :recenter-selection-enabled="recenterSelectionEnabled"
      @select="selectedId = $event"
    />

    <div
      v-if="kioskMode"
      class="pointer-events-none absolute left-4 top-4 z-10 sm:left-6 sm:top-6"
    >
      <div class="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-xl font-semibold tracking-[0.08em] text-white/92 shadow-xl shadow-slate-950/30 backdrop-blur-xl sm:px-5 sm:py-4 sm:text-3xl">
        {{ profileCount }}
      </div>
    </div>

    <div v-if="!kioskMode" class="pointer-events-none relative z-10 min-h-screen">
      <header class="pointer-events-auto absolute inset-x-0 top-0 px-4 py-4 sm:px-6">
        <div class="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-full border border-white/8 bg-slate-950/42 px-4 py-3 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
          <div class="min-w-0 flex items-center gap-4 max-md:flex-1">
            <img
              src="/logo.png"
              alt="Rstore Galaxy Logo"
              class="size-8 object-contain"
            >
            <div class="min-w-0 flex items-center gap-3 text-sm">
              <h1 class="truncate font-medium tracking-[0.18em] text-white/92 uppercase">
                <span class="max-md:hidden">Rstore</span> Galaxy
              </h1>
            </div>
          </div>

          <GalaxyUserSearch
            :items="sceneItems"
            :selected-id="selectedId"
            :current-user-profile-id="currentUserProfileId"
            @select="selectedId = $event"
          />

          <div class="flex items-center gap-2 sm:gap-3">
            <UButton
              v-if="isDev"
              :color="recenterSelectionEnabled ? 'primary' : 'neutral'"
              :variant="recenterSelectionEnabled ? 'soft' : 'ghost'"
              icon="lucide:locate-fixed"
              class="rounded-full max-md:hidden"
              :aria-pressed="recenterSelectionEnabled"
              @click="recenterSelectionEnabled = !recenterSelectionEnabled"
            >
              Recenter 1s
            </UButton>
            <UButton
              v-if="!loggedIn"
              to="/login"
              color="neutral"
              variant="ghost"
              icon="lucide:github"
              class="rounded-full"
            >
              Login
            </UButton>

            <template v-else>
              <UUser
                :name="user?.name || user?.login"
                :description="`@${user?.login}`"
                :avatar="{ src: user?.avatarUrl, alt: user?.login }"
                size="sm"
                class="hidden sm:flex"
              />
              <UButton
                v-if="loggedIn"
                color="neutral"
                variant="ghost"
                icon="lucide:pen"
                class="rounded-full"
                @click="editOwnOrbit"
              >
                <template v-if="!isMobile">
                  Edit orbit
                </template>
              </UButton>
              <UButton
                color="neutral"
                variant="ghost"
                icon="lucide:log-out"
                class="rounded-full"
                @click="logout"
              >
                <template v-if="!isMobile">
                  Logout
                </template>
              </UButton>
            </template>
          </div>
        </div>
      </header>

      <section class="pointer-events-none absolute inset-y-0 right-0 hidden w-full max-w-md p-4 lg:block lg:p-6">
        <div class="flex h-full max-h-[calc(100dvh-5rem)] items-start justify-end pt-20 overflow-y-auto">
          <div class="pointer-events-auto w-full max-w-sm rounded-[1.75rem] border border-white/8 bg-slate-950/42 p-5 shadow-2xl shadow-slate-950/25 backdrop-blur-2xl">
            <div class="mb-4 flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-white/45">
              <span>{{ hasSelection ? 'Object details' : 'Overview' }}</span>
              <div class="flex items-center gap-2">
                <span>{{ profileCount }} total</span>
                <UButton
                  v-if="hasSelection"
                  color="neutral"
                  variant="ghost"
                  icon="lucide:x"
                  size="xs"
                  class="rounded-full"
                  aria-label="Clear selection"
                  @click="clearSelection"
                />
              </div>
            </div>

            <div v-if="!hasSelection" class="hidden border-b border-white/8 pb-4 text-sm text-white/58 xl:block">
              Public galaxy view. Sign in to claim and tune one orbital object.
            </div>

            <div class="space-y-5" :class="[!hasSelection ? 'pt-4 xl:pt-0' : '']">
              <GalaxyInspector
                :selected-id="selectedId"
                :orbit-action-error="orbitActionError"
                @edit-own="editOwnOrbit"
                @login="navigateTo('/login')"
              />
              <GalaxyStressTestPanel
                :visible-synthetic-profile-count="stressTestVisibleSyntheticProfileCount"
                :scene-limit="1000"
                :selected-user-login="selectedUserLogin"
                @clear-selection="clearSelection"
              />
            </div>
          </div>
        </div>
      </section>

      <div class="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 lg:hidden">
        <div class="pointer-events-auto rounded-full border border-white/8 bg-slate-950/42 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-white/50 backdrop-blur-xl">
          Tap an orbiting body
        </div>
      </div>
    </div>

    <div
      v-if="!kioskMode && mobileInspectorOpen"
      class="fixed bottom-0 inset-x-0 z-10 p-4 flex items-center justify-around bg-default/90 backdrop-blur-2xl"
    >
      <UDrawer
        side="bottom"
        class="lg:hidden"
      >
        <UButton
          icon="lucide:info"
          variant="ghost"
          size="xl"
        />

        <template #content>
          <div class="p-4 overflow-y-auto">
            <div class="space-y-5">
              <GalaxyInspector
                :selected-id="selectedId"
                :orbit-action-error="orbitActionError"
                @edit-own="editOwnOrbit"
                @login="navigateTo('/login')"
              />
              <GalaxyStressTestPanel
                :visible-synthetic-profile-count="stressTestVisibleSyntheticProfileCount"
                :scene-limit="1000"
                :selected-user-login="selectedUserLogin"
                @clear-selection="clearSelection"
              />
            </div>
          </div>
        </template>
      </UDrawer>

      <UButton
        icon="lucide:x"
        color="neutral"
        variant="ghost"
        size="xl"
        @click="selectedId = null"
      />
    </div>
  </main>
</template>
