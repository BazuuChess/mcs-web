<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'

const route = useRoute()
const links = [
  {
    to: '/',
    label: 'Analyze',
    active: () => route.path === '/' || route.path.startsWith('/status'),
  },
  { to: '/predict', label: 'Predict a move', active: () => route.path.startsWith('/predict') },
]
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 pt-8 text-center">
      <NuxtLink
        to="/"
        class="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <h1 class="text-4xl font-bold text-primary hover:underline hover:decoration-highlight">
          My Chess Style
        </h1>
      </NuxtLink>
      <p class="text-xl text-muted-foreground">
        Analyze your chess games and discover your playing style
      </p>
      <nav aria-label="Main" class="mt-2 flex gap-2">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :aria-current="link.active() ? 'page' : undefined"
          class="rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
          :class="link.active() ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </header>

    <main class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <NuxtPage />
    </main>

    <Toaster position="top-right" />
  </div>
</template>
