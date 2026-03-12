<script setup lang="ts">
defineProps<{
  orbitActionError: string | null
  sceneLimit: number
  selectedId: string | null
  selectedUserLogin: string | null
  visibleSyntheticProfileCount: number
}>()

defineEmits<{
  clearSelection: []
  editOwn: []
  login: []
}>()
</script>

<template>
  <div class="space-y-5">
    <GalaxyInspector
      :selected-id="selectedId"
      :orbit-action-error="orbitActionError"
      @edit-own="$emit('editOwn')"
      @login="$emit('login')"
    />
    <GalaxyStressTestPanel
      :visible-synthetic-profile-count="visibleSyntheticProfileCount"
      :scene-limit="sceneLimit"
      :selected-user-login="selectedUserLogin"
      @clear-selection="$emit('clearSelection')"
    />
  </div>
</template>
