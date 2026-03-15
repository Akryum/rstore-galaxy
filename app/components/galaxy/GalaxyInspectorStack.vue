<script setup lang="ts">
import type { SceneProfileItem } from '~/types/galaxy'

defineProps<{
  orbitActionError: string | null
  recentProfiles: SceneProfileItem[]
  sceneLimit: number
  selectedId: string | null
  selectedUserLogin: string | null
  visibleSyntheticProfileCount: number
}>()

defineEmits<{
  clearSelection: []
  editOwn: []
  login: []
  select: [id: string]
}>()
</script>

<template>
  <div class="space-y-5">
    <GalaxyInspector
      :selected-id="selectedId"
      :orbit-action-error="orbitActionError"
      :recent-profiles="recentProfiles"
      @edit-own="$emit('editOwn')"
      @login="$emit('login')"
      @select="$emit('select', $event)"
    />
    <GalaxyStressTestPanel
      :visible-synthetic-profile-count="visibleSyntheticProfileCount"
      :scene-limit="sceneLimit"
      :selected-user-login="selectedUserLogin"
      @clear-selection="$emit('clearSelection')"
    />
  </div>
</template>
