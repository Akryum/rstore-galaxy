<script setup lang="ts">
import {
  BODY_TYPE_META,
  formatOrbitDistance,
  formatOrbitLinearSpeed,
} from '~~/shared/galaxy'

const props = defineProps<{
  selectedId: string | null
  orbitActionError: string | null
}>()

const emit = defineEmits<{
  editOwn: []
  login: []
}>()

const store = useStore()
const { loggedIn, user } = useUserSession()

// The inspector follows the current selection key instead of duplicating scene state locally.
const { data: profile } = await store.celestialProfiles.query(builder =>
  builder.first(props.selectedId
    ? {
        key: props.selectedId,
        fetchPolicy: 'cache-and-fetch',
        params: {
          with: {
            user: true,
          },
        },
      }
    : {
        enabled: false,
      }),
)

const canEdit = computed(() => {
  return Boolean(loggedIn.value && user.value?.id && profile.value?.userId === user.value.id)
})
</script>

<template>
  <div class="space-y-5">
    <div v-if="profile && profile.user" class="space-y-4">
      <div class="flex items-start gap-4">
        <UAvatar
          :src="profile.user.avatarUrl"
          :alt="profile.user.login"
          size="xl"
          class="ring ring-white/10"
        />

        <div class="min-w-0 flex-1">
          <p class="text-[11px] uppercase tracking-[0.28em] text-white/42">
            Selected body
          </p>
          <h3 class="truncate text-xl font-medium text-white">
            {{ profile.user.name || profile.user.login }}
          </h3>
          <a
            class="inline-flex items-center gap-2 text-sm text-cyan-200/85 transition hover:text-cyan-100"
            :href="profile.user.profileUrl"
            rel="noreferrer"
            target="_blank"
          >
            <span>@{{ profile.user.login }}</span>
            <UIcon name="lucide:arrow-up-right" class="size-4" />
          </a>
        </div>
      </div>

      <template v-if="!isMobile || !canEdit">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <p class="text-[11px] uppercase tracking-[0.24em] text-white/42">
              Type
            </p>
            <p class="mt-2 text-base font-medium text-white">
              {{ BODY_TYPE_META[profile.bodyType].label }}
            </p>
            <p class="mt-1 text-sm text-white/58">
              {{ BODY_TYPE_META[profile.bodyType].flavor }}
            </p>
          </div>

          <div class="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <p class="text-[11px] uppercase tracking-[0.24em] text-white/42">
              Orbit
            </p>
            <p class="mt-2 text-base font-medium text-white">
              {{ formatOrbitDistance(profile.orbitDistance) }}
            </p>
            <p class="mt-1 text-sm text-white/58">
              {{ formatOrbitLinearSpeed(profile.orbitDistance, profile.orbitSpeed) }}
            </p>
          </div>
        </div>

        <div class="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <p class="text-[11px] uppercase tracking-[0.24em] text-white/42">
            Profile
          </p>
          <p class="mt-2 text-sm leading-6 text-white/70">
            {{ profile.user.bio || BODY_TYPE_META[profile.bodyType].description }}
          </p>
          <p v-if="profile.user.location" class="mt-2 text-sm text-cyan-100/65">
            {{ profile.user.location }}
          </p>
        </div>
      </template>
    </div>

    <div v-else class="space-y-4">
      <div class="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-5">
        <p class="text-[11px] uppercase tracking-[0.28em] text-white/42">
          Galaxy overview
        </p>
        <h3 class="mt-3 text-lg font-medium text-white">
          Click any orbiting body.
        </h3>
        <p class="mt-2 text-sm leading-6 text-white/64">
          Each GitHub account appears here as a live orbital signature. Your own object unlocks editing.
        </p>
      </div>

      <UButton
        v-if="!loggedIn"
        block
        color="neutral"
        variant="ghost"
        icon="lucide:github"
        class="justify-center rounded-full"
        @click="emit('login')"
      >
        Login with GitHub
      </UButton>

      <UButton
        v-else
        block
        color="neutral"
        variant="ghost"
        icon="lucide:pencil"
        class="justify-center rounded-full"
        @click="emit('editOwn')"
      >
        Edit my orbit
      </UButton>

      <p v-if="orbitActionError" class="rounded-2xl border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-amber-100">
        {{ orbitActionError }}
      </p>
    </div>

    <GalaxyItemForm
      v-if="profile && canEdit"
      :profile
    />

    <div v-else-if="profile && !canEdit && !loggedIn" class="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-white/64">
      Login with GitHub to create and tune your own orbital object.
    </div>

    <div v-else-if="profile && !canEdit && loggedIn" class="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
      <p class="text-sm text-white/64">
        Viewing another user’s object. Jump to your own orbit to customize it.
      </p>

      <UButton
        block
        color="neutral"
        variant="ghost"
        icon="lucide:pencil"
        class="justify-center rounded-full"
        @click="emit('editOwn')"
      >
        Edit my orbit
      </UButton>

      <p v-if="orbitActionError" class="rounded-2xl border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-amber-100">
        {{ orbitActionError }}
      </p>
    </div>
  </div>
</template>
