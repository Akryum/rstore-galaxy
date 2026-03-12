import type { SceneProfileItem } from '~/types/galaxy'
import { isRealtimeStressLogin } from '~~/shared/galaxy'

interface RefreshableSceneQuery {
  refresh: () => Promise<unknown>
}

export async function useGalaxyPageState() {
  const store = useStore()
  const route = useRoute()
  const { loggedIn, user, clear } = useUserSession()

  // This live query is the main rstore demo on the page:
  // it keeps the galaxy in sync while still rendering cached data immediately.
  const sceneQuery = await store.celestialProfiles.liveQuery(builder =>
    builder.many({
      fetchPolicy: 'cache-and-fetch',
      params: {
        orderBy: ['updatedAt.desc'],
        limit: 1000,
      },
      include: {
        user: true,
      },
    }),
  )

  // Always perform a one-off query to ensure the user's profile is loaded and cached.
  // Because it might not in the last 1000 updated profiles, and we want it to be available immediately if they have one.
  await store.celestialProfiles.liveQuery(q => q.first(user.value?.id
    ? {
        where: eq('userId', user.value.id),
        include: {
          user: true,
        },
      }
    : {
        enabled: false,
      }))

  // The live query subscribes to profiles. We also warm a users subscription so
  // GitHub profile changes propagate into the related inspector/search UI.
  store.users.subscribe(subscribe => subscribe({}))

  // We use peekMany here to get all loaded profiles (from both the 1000 profiles and the current user profile)
  const sceneItems = computed(() => store.celestialProfiles.peekMany()) as Ref<SceneProfileItem[]>

  const selectedId = ref<string | null>(null)
  const recenterSelectionEnabled = ref(false)
  const mobileInspectorOpen = ref(false)
  const orbitActionError = ref<string | null>(null)

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

    return sceneItems.value.find(item => item.userId === user.value!.id)?.id ?? null
  })
  const hasSelection = computed(() => Boolean(selectedId.value))
  const stressTestVisibleSyntheticProfileCount = computed(() => {
    return sceneItems.value.filter(item => isRealtimeStressLogin(item.user.login)).length
  })
  const selectedUserLogin = computed(() => selectedProfile.value?.user.login ?? null)
  const kioskMode = computed(() => route.query.kiosk === 'true')

  function refreshSceneQuery() {
    return (sceneQuery as typeof sceneQuery & RefreshableSceneQuery).refresh()
  }

  function clearSelection() {
    selectedId.value = null
    mobileInspectorOpen.value = false
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      clearSelection()
    }
  }

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

  if (import.meta.client) {
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

  return {
    currentUserProfileId,
    clearSelection,
    editOwnOrbit,
    hasSelection,
    kioskMode,
    loggedIn,
    logout,
    mobileInspectorOpen,
    orbitActionError,
    profileCount,
    recenterSelectionEnabled,
    sceneItems,
    selectedId,
    selectedUserLogin,
    stressTestVisibleSyntheticProfileCount,
    user,
  }
}
