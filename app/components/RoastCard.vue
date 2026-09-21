<script setup lang="ts">
import { Flame } from '@lucide/vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { RoastData } from '~/types'

const props = defineProps<{ roast: RoastData | null }>()

// On an LLM failure the backend sends an apology in `roast` and leaves the rest empty.
const sections = computed(() => {
  if (!props.roast) return []
  return [
    {
      key: 'roast',
      title: 'The Roast',
      text: props.roast.roast,
      classes: 'border-destructive bg-destructive/15',
    },
    {
      key: 'encouragement',
      title: 'Encouragement',
      text: props.roast.encouragement,
      // Not a tint of coral: coral and brick are too close to tell apart side by side.
      classes: 'border-highlight bg-muted',
    },
    {
      key: 'tip',
      title: 'Tips for Improvement',
      text: props.roast.tip,
      classes: 'border-success bg-success/20',
    },
  ].filter((section) => section.text?.trim())
})
</script>

<template>
  <Card class="w-full">
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-xl font-black text-primary">
        <Flame class="size-5" aria-hidden="true" />
        AI Roast &amp; Commentary
      </CardTitle>
      <CardDescription>Brutally honest analysis with a side of encouragement</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <p v-if="!sections.length" class="text-muted-foreground">No roast was generated.</p>
      <section
        v-for="section in sections"
        :key="section.key"
        :class="['rounded-lg border-l-4 p-4', section.classes]"
        :data-section="section.key"
      >
        <h3 class="mb-1 font-bold">{{ section.title }}</h3>
        <p class="whitespace-pre-line">{{ section.text }}</p>
      </section>
    </CardContent>
  </Card>
</template>
