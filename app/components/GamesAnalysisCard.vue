<script setup lang="ts">
import { Flag, Handshake, Trophy } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GameData, TimeControl } from '~/types'

const props = defineProps<{ game: GameData | null }>()

const TIME_CONTROLS: { key: TimeControl; label: string }[] = [
  { key: 'bullet', label: 'Bullet' },
  { key: 'blitz', label: 'Blitz' },
  { key: 'rapid', label: 'Rapid' },
  { key: 'classical', label: 'Classical' },
]

const hasGames = computed(() => Boolean(props.game?.count))
const rates = computed(() => (props.game ? winRates(props.game) : null))
</script>

<template>
  <Card class="w-full">
    <CardHeader>
      <CardTitle class="text-xl">Preliminary Game Analysis</CardTitle>
    </CardHeader>

    <CardContent v-if="!game || !hasGames || !rates">
      <p class="font-semibold text-primary">No games played by user</p>
    </CardContent>

    <CardContent v-else class="flex flex-col gap-6">
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div class="rounded-lg bg-muted p-4 text-center">
          <p class="text-2xl font-black">{{ game.count }}</p>
          <p class="text-sm text-muted-foreground">Total games</p>
        </div>
        <div class="rounded-lg bg-success/25 p-4 text-center" data-testid="win-rate">
          <Trophy class="mx-auto mb-1 size-4" aria-hidden="true" />
          <p class="text-2xl font-black">{{ formatPercent(rates.win) }}</p>
          <p class="text-sm">Win rate ({{ game.win_count ?? 0 }} games)</p>
        </div>
        <div class="rounded-lg bg-warning/25 p-4 text-center" data-testid="draw-rate">
          <Handshake class="mx-auto mb-1 size-4" aria-hidden="true" />
          <p class="text-2xl font-black">{{ formatPercent(rates.draw) }}</p>
          <p class="text-sm">Draw rate ({{ game.draw_count ?? 0 }} games)</p>
        </div>
        <div class="rounded-lg bg-destructive/20 p-4 text-center" data-testid="loss-rate">
          <Flag class="mx-auto mb-1 size-4" aria-hidden="true" />
          <p class="text-2xl font-black">{{ formatPercent(rates.loss) }}</p>
          <p class="text-sm">Loss rate ({{ game.loss_count ?? 0 }} games)</p>
        </div>
      </div>

      <section>
        <h3 class="mb-3 text-lg font-semibold">Average opponent rating by time control</h3>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div
            v-for="control in TIME_CONTROLS"
            :key="control.key"
            class="rounded-lg bg-muted p-4 text-center"
          >
            <p class="text-xl font-black">
              {{ formatRating(game.opponents_avg_rating[control.key]) }}
            </p>
            <p class="text-sm text-muted-foreground">{{ control.label }}</p>
          </div>
        </div>
      </section>

      <section v-if="game.openings.length">
        <h3 class="mb-3 text-lg font-semibold">Top openings</h3>
        <ol class="flex flex-col gap-2">
          <li
            v-for="[name, stats] in game.openings"
            :key="name"
            class="flex items-center justify-between gap-4 rounded-lg bg-muted p-3"
          >
            <div>
              <p class="font-semibold">{{ name }}</p>
              <p class="text-sm text-muted-foreground">ECO: {{ stats.eco_codes.join(', ') }}</p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold text-primary">{{ stats.total }}</p>
              <p class="text-sm text-muted-foreground">games</p>
            </div>
          </li>
        </ol>
      </section>
    </CardContent>
  </Card>
</template>
