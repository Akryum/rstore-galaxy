<script setup lang="ts">
import type { User } from '#auth-utils'
import type { SceneProfileItem } from '~/types/galaxy'

defineProps<{
  currentUserProfileId: string | null
  items: SceneProfileItem[]
  loggedIn: boolean
  recenterSelectionEnabled: boolean
  selectedId: string | null
  showRecenterToggle: boolean
  user: User | null
}>()

defineEmits<{
  editOwn: []
  logout: []
  select: [id: string]
  toggleRecenter: []
}>()
</script>

<template>
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
        :items="items"
        :selected-id="selectedId"
        :current-user-profile-id="currentUserProfileId"
        @select="$emit('select', $event)"
      />

      <div class="flex items-center gap-2 sm:gap-3">
        <UButton
          v-if="showRecenterToggle"
          :color="recenterSelectionEnabled ? 'primary' : 'neutral'"
          :variant="recenterSelectionEnabled ? 'soft' : 'ghost'"
          icon="lucide:locate-fixed"
          class="rounded-full max-md:hidden"
          :aria-pressed="recenterSelectionEnabled"
          @click="$emit('toggleRecenter')"
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
            color="neutral"
            variant="ghost"
            icon="lucide:pen"
            class="rounded-full"
            @click="$emit('editOwn')"
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
            @click="$emit('logout')"
          >
            <template v-if="!isMobile">
              Logout
            </template>
          </UButton>
        </template>
      </div>
    </div>
  </header>
</template>
