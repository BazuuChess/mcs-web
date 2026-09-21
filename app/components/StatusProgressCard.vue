<script setup lang="ts">
import type { Component } from 'vue'
import { Brain, Check, ChartColumn, CircleCheckBig, Copy, Flame, RefreshCw } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { AnalysisResult, PollState, StageKey } from '~/types'

const props = defineProps<{
  statusId: string
  /** `null` until the first response arrives. */
  result: AnalysisResult | null
  roast: boolean | undefined
  progress: number
  state: PollState
  error: string | null
}>()

const emit = defineEmits<{ retry: [] }>()

interface StageView {
  key: StageKey
  icon: Component
  done: string
  pending: string
  comingSoon?: string
}

const STAGES: StageView[] = [
  { key: 'file_upload', icon: CircleCheckBig, done: 'Games found', pending: 'Loading games…' },
  { key: 'game', icon: ChartColumn, done: 'Stats analyzed', pending: 'Analyzing games…' },
  { key: 'roasting_user', icon: Flame, done: 'User roasted', pending: 'Roasting in progress…' },
  {
    key: 'chess_style',
    icon: Brain,
    done: 'Style analyzed',
    pending: 'Analyzing playing style…',
    comingSoon: 'Playing style: coming soon',
  },
]

const stages = computed(() => {
  const result = props.result ?? {}
  return STAGES.map((stage) => ({
    ...stage,
    status: stageState(result, stage.key, props.roast),
  })).filter((stage) => stage.status !== 'skipped')
})

function label(stage: (typeof stages.value)[number]): string {
  if (stage.status === 'done') return stage.done
  if (stage.status === 'coming-soon') return stage.comingSoon ?? stage.pending
  return stage.pending
}

const queued = computed(
  () =>
    props.state === 'polling' && props.result !== null && Object.keys(props.result).length === 0,
)

const { copy, copied } = useClipboard({ copiedDuring: 2000 })

async function copyId() {
  try {
    await copy(props.statusId)
  } catch {
    toast.error('Could not copy the tracking ID')
  }
}
</script>

<template>
  <Card class="w-full">
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-2xl font-bold">
        <ChartColumn class="size-6" aria-hidden="true" />
        Analysis Progress
      </CardTitle>
      <CardDescription class="flex flex-wrap items-center gap-2">
        <span>Tracking ID:</span>
        <span class="font-mono break-all text-foreground">{{ statusId }}</span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label="Copy tracking ID"
          @click="copyId"
        >
          <Check v-if="copied" />
          <Copy v-else />
          {{ copied ? 'Copied' : 'Copy' }}
        </Button>
      </CardDescription>
    </CardHeader>

    <CardContent class="flex flex-col gap-4">
      <div
        v-if="error"
        role="alert"
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg border-l-4 border-destructive bg-destructive/15 p-3"
      >
        <p class="text-sm">{{ error }}</p>
        <Button type="button" variant="outline" size="sm" @click="emit('retry')">
          <RefreshCw /> Retry
        </Button>
      </div>

      <div
        v-else-if="state === 'timeout'"
        role="status"
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg border-l-4 border-warning bg-warning/15 p-3"
      >
        <p class="text-sm">
          This is taking longer than expected. Keep your tracking ID and check back later.
        </p>
        <Button type="button" variant="outline" size="sm" @click="emit('retry')">
          <RefreshCw /> Keep checking
        </Button>
      </div>

      <div v-if="result === null && !error" class="flex flex-col gap-3" aria-label="Loading status">
        <Skeleton class="h-2 w-full" />
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton v-for="n in 4" :key="n" class="h-12 rounded-lg" />
        </div>
      </div>

      <template v-else-if="result !== null">
        <div class="flex flex-col gap-1">
          <Progress :model-value="progress" aria-label="Analysis progress" />
          <p class="text-right text-sm text-muted-foreground">
            {{ progress }}%<span v-if="queued"> · Queued, waiting for the first stage</span>
          </p>
        </div>

        <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <li
            v-for="stage in stages"
            :key="stage.key"
            :data-stage="stage.key"
            :data-state="stage.status"
            :class="
              cn(
                'flex items-center gap-2 rounded-lg p-3 text-sm',
                stage.status === 'done' && 'bg-success/25 text-foreground',
                stage.status === 'pending' && 'bg-muted text-foreground/70',
                stage.status === 'coming-soon' &&
                  'border border-dashed bg-background text-foreground/70',
              )
            "
          >
            <Check v-if="stage.status === 'done'" class="size-4 shrink-0" aria-hidden="true" />
            <component :is="stage.icon" v-else class="size-4 shrink-0" aria-hidden="true" />
            <span>{{ label(stage) }}</span>
          </li>
        </ul>
      </template>
    </CardContent>
  </Card>
</template>
