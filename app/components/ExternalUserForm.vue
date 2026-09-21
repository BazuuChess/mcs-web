<script setup lang="ts">
import { Loader2, User } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Platform } from '~/types'

const PLATFORMS: { label: string; value: Platform }[] = [
  { label: 'Chess.com', value: 'chess.com' },
  { label: 'Lichess', value: 'lichess' },
]

const api = useAnalysisApi()
const { submitting, start } = useStartAnalysis()

const platformId = useId()
const usernameId = useId()

const platform = ref<Platform>('chess.com')
const username = ref('')
const includeRoast = ref(false)

const canSubmit = computed(() => username.value.trim() !== '')

function submit() {
  if (!canSubmit.value) return
  void start(
    () =>
      api.startExternalUser({
        username: username.value,
        platform: platform.value,
        includeRoast: includeRoast.value,
      }),
    includeRoast.value,
  )
}
</script>

<template>
  <form class="flex flex-col gap-5" @submit.prevent="submit">
    <div class="flex flex-col gap-2">
      <Label :for="platformId" class="font-semibold">Platform</Label>
      <Select v-model="platform">
        <SelectTrigger :id="platformId" class="w-full">
          <SelectValue placeholder="Select chess platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="option in PLATFORMS" :key="option.value" :value="option.value">
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="flex flex-col gap-2">
      <Label :for="usernameId" class="font-semibold">Username</Label>
      <Input
        :id="usernameId"
        v-model="username"
        placeholder="Enter your username"
        autocomplete="off"
      />
    </div>

    <RoastToggle v-model="includeRoast" />

    <Button type="submit" class="w-full" :disabled="!canSubmit || submitting">
      <Loader2 v-if="submitting" class="animate-spin" />
      <User v-else />
      Analyze Games
    </Button>
  </form>
</template>
