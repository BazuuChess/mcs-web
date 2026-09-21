<script setup lang="ts">
import { Loader2, Upload } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const api = useAnalysisApi()
const { submitting, start } = useStartAnalysis()

const fileId = useId()
const usernameId = useId()

const file = ref<File | null>(null)
const username = ref('')
const includeRoast = ref(false)

const canSubmit = computed(() => file.value !== null && username.value.trim() !== '')

function onFileChange(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

function submit() {
  if (!canSubmit.value || !file.value) return
  const pgn = file.value
  void start(
    () =>
      api.startPgnUpload({
        file: pgn,
        usernames: username.value,
        includeRoast: includeRoast.value,
      }),
    includeRoast.value,
  )
}
</script>

<template>
  <form class="flex flex-col gap-5" @submit.prevent="submit">
    <div class="flex flex-col gap-2">
      <Label :for="fileId" class="font-semibold">PGN file</Label>
      <Input :id="fileId" type="file" accept=".pgn" @change="onFileChange" />
    </div>

    <div class="flex flex-col gap-2">
      <Label :for="usernameId" class="font-semibold">Your username (for analysis)</Label>
      <Input
        :id="usernameId"
        v-model="username"
        placeholder="Enter your chess username"
        autocomplete="off"
      />
    </div>

    <RoastToggle v-model="includeRoast" />

    <Button type="submit" class="w-full" :disabled="!canSubmit || submitting">
      <Loader2 v-if="submitting" class="animate-spin" />
      <Upload v-else />
      Analyze PGN File
    </Button>
  </form>
</template>
