<script setup lang="ts">
const { ready, fetch } = useUserSession()

if (!ready.value) {
  await fetch()
}

useHead({
  title: 'Rstore Galaxy',
  titleTemplate: title => title ? `${title} · Rstore Galaxy` : 'Rstore Galaxy',
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
