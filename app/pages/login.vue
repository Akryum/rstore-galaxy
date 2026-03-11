<script setup lang="ts">
useHead({
  title: 'Login',
})

const route = useRoute()
const hasError = computed(() => route.query.error === 'github_oauth')
</script>

<template>
  <main class="relative min-h-screen overflow-hidden">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,246,255,0.12),transparent_30%),linear-gradient(180deg,#060816,#0f1730)]" />

    <div class="relative mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
      <div class="w-full max-w-md rounded-[2rem] border border-white/8 bg-slate-950/36 p-7 text-center shadow-2xl shadow-slate-950/25 backdrop-blur-2xl">
        <p class="text-[11px] uppercase tracking-[0.34em] text-white/45">
          Rstore Galaxy
        </p>

        <h1 class="mt-4 text-3xl font-medium tracking-tight text-white sm:text-4xl">
          Sign in
        </h1>

        <p class="mt-3 text-sm leading-7 text-white/62">
          Claim your orbiting stellar object.
        </p>

        <p v-if="hasError" class="mt-5 rounded-2xl border border-rose-300/20 bg-rose-300/8 px-4 py-3 text-sm text-rose-100">
          Authentication did not complete. Check the OAuth settings and try again.
        </p>

        <div class="mt-8 space-y-3">
          <UButton
            block
            href="/auth/github"
            external
            color="neutral"
            icon="lucide:github"
            size="lg"
            class="justify-center rounded-full"
          >
            Continue with GitHub
          </UButton>

          <UButton
            block
            to="/"
            variant="ghost"
            color="neutral"
            size="lg"
            class="justify-center rounded-full"
          >
            Back to galaxy
          </UButton>
        </div>
      </div>
    </div>
  </main>
</template>
