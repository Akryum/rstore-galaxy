<script setup lang="ts">
const {
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
} = await useGalaxyPageState()

const stressPanelSceneLimit = 1000
const showRecenterToggle = import.meta.dev

function toggleRecenterSelection() {
  recenterSelectionEnabled.value = !recenterSelectionEnabled.value
}
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
      <GalaxyHeaderBar
        :items="sceneItems"
        :selected-id="selectedId"
        :current-user-profile-id="currentUserProfileId"
        :logged-in="loggedIn"
        :user="user"
        :recenter-selection-enabled="recenterSelectionEnabled"
        :show-recenter-toggle="showRecenterToggle"
        @select="selectedId = $event"
        @toggle-recenter="toggleRecenterSelection"
        @edit-own="editOwnOrbit"
        @logout="logout"
      />

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

            <div :class="[!hasSelection ? 'pt-4 xl:pt-0' : '']">
              <GalaxyInspectorStack
                :selected-id="selectedId"
                :orbit-action-error="orbitActionError"
                :visible-synthetic-profile-count="stressTestVisibleSyntheticProfileCount"
                :scene-limit="stressPanelSceneLimit"
                :selected-user-login="selectedUserLogin"
                @edit-own="editOwnOrbit"
                @login="navigateTo('/login')"
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
            <GalaxyInspectorStack
              :selected-id="selectedId"
              :orbit-action-error="orbitActionError"
              :visible-synthetic-profile-count="stressTestVisibleSyntheticProfileCount"
              :scene-limit="stressPanelSceneLimit"
              :selected-user-login="selectedUserLogin"
              @edit-own="editOwnOrbit"
              @login="navigateTo('/login')"
              @clear-selection="clearSelection"
            />
          </div>
        </template>
      </UDrawer>

      <UButton
        icon="lucide:x"
        color="neutral"
        variant="ghost"
        size="xl"
        @click="clearSelection"
      />
    </div>
  </main>
</template>
