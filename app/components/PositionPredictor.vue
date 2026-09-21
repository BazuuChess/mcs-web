<script setup lang="ts">
import { ArrowLeftRight, Loader2, RotateCcw, Sparkles } from '@lucide/vue'
import { TheChessboard } from 'vue3-chessboard'
import type { BoardApi } from 'vue3-chessboard'
import 'vue3-chessboard/style.css'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PredictedMove, PredictionReason } from '~/types'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const REASONS: Record<PredictionReason, string> = {
  checkmate: 'delivers checkmate',
  capture: 'wins material',
  check: 'gives check',
  'first-legal': 'is a playable move',
}

const predictApi = usePredictApi()
const fenId = useId()

const boardApi = shallowRef<BoardApi | null>(null)
const fen = ref(START_FEN)
const fenInput = ref(START_FEN)
const fenError = ref<string | null>(null)
const prediction = ref<PredictedMove | null>(null)
const predictError = ref<string | null>(null)
const predicting = ref(false)

const sideToMove = computed(() => (fen.value.split(' ')[1] === 'b' ? 'Black' : 'White'))

function clearPrediction() {
  prediction.value = null
  predictError.value = null
  boardApi.value?.setShapes([])
}

function syncFromBoard() {
  if (!boardApi.value) return
  fen.value = boardApi.value.getFen()
  fenInput.value = fen.value
  fenError.value = null
  clearPrediction()
}

function onBoardCreated(api: BoardApi) {
  boardApi.value = api
  syncFromBoard()
}

function applyFen() {
  const next = fenInput.value.trim()
  if (!isValidFen(next)) {
    fenError.value = 'That is not a valid FEN position.'
    return
  }
  fenError.value = null
  boardApi.value?.setPosition(next)
  fen.value = next
  clearPrediction()
}

function resetBoard() {
  boardApi.value?.resetBoard()
  syncFromBoard()
}

async function predict() {
  if (predicting.value) return
  predicting.value = true
  clearPrediction()
  try {
    const move = await predictApi.predictNextMove(fen.value)
    prediction.value = move
    boardApi.value?.drawMove(move.from as never, move.to as never, 'green')
  } catch (err) {
    predictError.value = err instanceof PredictError ? err.message : parseApiError(err)
  } finally {
    predicting.value = false
  }
}
</script>

<template>
  <Card class="w-full">
    <CardHeader>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <CardTitle class="text-xl">Predict the next move</CardTitle>
        <Badge variant="secondary">Preview: predictions are simulated</Badge>
      </div>
      <CardDescription>
        Play moves on the board or paste a FEN, then ask for the next move. The prediction service
        isn't live yet, so suggestions come from a simple stand-in.
      </CardDescription>
    </CardHeader>

    <CardContent class="flex flex-col gap-5">
      <!--
        vue3-chessboard sizes `.main-wrap` from the viewport height (90vh, max 700px) in unlayered CSS,
        which beats Tailwind's layered utilities, hence the `!` (important) modifiers.
      -->
      <div class="mx-auto w-full max-w-[520px] [&_.main-wrap]:w-full! [&_.main-wrap]:max-w-none!">
        <ClientOnly>
          <TheChessboard
            :board-config="{ coordinates: true }"
            @board-created="onBoardCreated"
            @move="syncFromBoard"
          />
        </ClientOnly>
      </div>

      <p class="text-center text-sm text-muted-foreground" data-testid="side-to-move">
        {{ sideToMove }} to move
      </p>

      <div class="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" size="sm" @click="boardApi?.toggleOrientation()">
          <ArrowLeftRight /> Flip board
        </Button>
        <Button type="button" variant="outline" size="sm" @click="resetBoard">
          <RotateCcw /> Reset
        </Button>
      </div>

      <form class="flex flex-col gap-2" @submit.prevent="applyFen">
        <Label :for="fenId" class="font-semibold">Position (FEN)</Label>
        <div class="flex gap-2">
          <Input
            :id="fenId"
            v-model="fenInput"
            class="font-mono"
            autocomplete="off"
            spellcheck="false"
            :aria-invalid="fenError !== null"
          />
          <Button type="submit" variant="secondary">Load</Button>
        </div>
        <p v-if="fenError" role="alert" class="text-sm text-foreground/80">{{ fenError }}</p>
      </form>

      <Button type="button" class="w-full" :disabled="predicting" @click="predict">
        <Loader2 v-if="predicting" class="animate-spin" />
        <Sparkles v-else />
        Predict next move
      </Button>

      <div
        v-if="predictError"
        role="alert"
        class="rounded-lg border-l-4 border-destructive bg-destructive/15 p-3 text-sm"
      >
        {{ predictError }}
      </div>

      <div
        v-if="prediction"
        role="status"
        class="rounded-lg border-l-4 border-success bg-success/20 p-4"
        data-testid="prediction"
      >
        <p class="text-lg font-bold">
          Suggested move: <span data-testid="prediction-san">{{ prediction.san }}</span>
          <span class="ml-1 font-mono text-sm font-normal">({{ prediction.uci }})</span>
        </p>
        <p class="text-sm">
          This move {{ REASONS[prediction.reason] }}. Simulated confidence:
          {{ Math.round(prediction.confidence * 100) }}%.
        </p>
      </div>
    </CardContent>
  </Card>
</template>
