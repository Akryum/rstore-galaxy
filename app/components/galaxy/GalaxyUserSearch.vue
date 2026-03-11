<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import { BODY_TYPE_META, formatOrbitDistance, formatOrbitSpeed } from '~~/shared/galaxy'

type SceneProfileItem = StoreWrappedItem<'celestialProfiles'> & {
  user: StoreWrappedItem<'users'>
}

const props = defineProps<{
  items: SceneProfileItem[]
  selectedId: string | null
  currentUserProfileId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const searchOpen = ref(false)
const searchTerm = ref('')

const searchGroups = computed<CommandPaletteGroup[]>(() => {
  if (!searchOpen.value) {
    return []
  }

  const liveBodyItems: CommandPaletteItem[] = props.items
    .toSorted((left, right) => {
      if (left.id === props.selectedId) {
        return -1
      }

      if (right.id === props.selectedId) {
        return 1
      }

      if (left.id === props.currentUserProfileId) {
        return -1
      }

      if (right.id === props.currentUserProfileId) {
        return 1
      }

      const leftLabel = left.user.name || left.user.login
      const rightLabel = right.user.name || right.user.login
      return leftLabel.localeCompare(rightLabel)
    })
    .map((profile) => {
      return {
        id: profile.id,
        label: profile.user.name || profile.user.login,
        prefix: `@${profile.user.login}`,
        suffix: BODY_TYPE_META[profile.bodyType].label,
        avatar: {
          src: profile.user.avatarUrl,
          alt: profile.user.login,
        },
        description: [
          profile.user.name || `@${profile.user.login}`,
          formatOrbitDistance(Number(profile.orbitDistance)),
          formatOrbitSpeed(Number(profile.orbitSpeed)),
          profile.user.location || profile.user.bio || 'No profile note',
        ].join(' • '),
        active: profile.id === props.selectedId,
        onSelect: () => selectProfile(profile.id),
      }
    })

  return [{
    id: 'items',
    label: 'Users',
    items: liveBodyItems,
  }]
})

const searchFuse = {
  fuseOptions: {
    ignoreLocation: true,
    threshold: 0.2,
    keys: ['label', 'prefix', 'suffix', 'description'],
  },
  resultLimit: 24,
  matchAllWhenSearchEmpty: true,
}

watch(searchOpen, (value) => {
  if (!value) {
    searchTerm.value = ''
  }
})

defineShortcuts({
  meta_k: {
    usingInput: true,
    handler: () => {
      searchOpen.value = !searchOpen.value
    },
  },
  ctrl_k: {
    usingInput: true,
    handler: () => {
      searchOpen.value = !searchOpen.value
    },
  },
})

function selectProfile(id: string) {
  emit('select', id)
  searchOpen.value = false
}
</script>

<template>
  <div class="contents">
    <button
      type="button"
      class="hidden min-w-0 flex-1 items-center justify-between gap-4 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-left text-sm text-white/60 transition hover:bg-white/[0.06] md:flex md:max-w-md lg:max-w-xl"
      @click="searchOpen = true"
    >
      <span class="flex min-w-0 items-center gap-3">
        <UIcon name="lucide:search" class="size-4 shrink-0 text-cyan-100/70" />
        <span class="truncate">Search...</span>
      </span>
      <span class="flex items-center gap-1 text-white/40">
        <UKbd value="meta" size="sm" color="neutral" />
        <UKbd value="K" size="sm" color="neutral" />
      </span>
    </button>

    <UButton
      color="neutral"
      variant="ghost"
      icon="lucide:search"
      class="rounded-full md:hidden"
      aria-label="Search bodies"
      @click="searchOpen = true"
    />

    <UModal
      v-model:open="searchOpen"
      :fullscreen="isMobile"
      :ui="{ overlay: 'bg-slate-950/72 backdrop-blur-sm' }"
    >
      <template #content>
        <div @keydown.esc.stop>
          <UCommandPalette
            v-model:search-term="searchTerm"
            :groups="searchGroups"
            :fuse="searchFuse"
            :virtualize="{ estimateSize: 66, overscan: 18 }"
            preserve-group-order
            placeholder="Search..."
            close
            :input="{ fixed: true, size: 'lg' }"
            :ui="{
              root: 'border-0 bg-transparent',
              content: 'border-0 bg-transparent',
              viewport: 'max-h-[min(60vh,34rem)] px-2 pb-2',
              empty: 'px-4 py-8 text-sm text-white/55',
              label: 'px-4 pt-3 pb-2 text-[10px] font-medium uppercase tracking-[0.28em] text-white/35',
              item: 'rounded-2xl px-4 py-3 data-[highlighted]:bg-white/8',
              itemDescription: 'text-white/52',
            }"
            @update:open="searchOpen = $event"
          >
            <template #empty="{ searchTerm: value }">
              No galaxy body matches "{{ value }}".
            </template>
          </UCommandPalette>
        </div>
      </template>
    </UModal>
  </div>
</template>
