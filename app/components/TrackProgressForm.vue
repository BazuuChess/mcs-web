<script setup lang="ts">
import { Search } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const trackingId = ref('')
const inputId = useId()
const hintId = useId()

const trimmed = computed(() => trackingId.value.trim())
const valid = computed(() => isUuid(trimmed.value))
// Only nag once something has been typed.
const showHint = computed(() => trimmed.value !== '' && !valid.value)

function submit() {
  if (!valid.value) return
  // The roast flag is unknown here, so the status page falls back to its grace window.
  void navigateTo(`/status/${trimmed.value.toLowerCase()}`)
}
</script>

<template>
  <form class="flex flex-col gap-5" @submit.prevent="submit">
    <div class="flex flex-col gap-2">
      <Label :for="inputId" class="font-semibold">Tracking ID</Label>
      <Input
        :id="inputId"
        v-model="trackingId"
        placeholder="123e4567-e89b-12d3-a456-426614174000"
        autocomplete="off"
        :aria-invalid="showHint"
        :aria-describedby="showHint ? hintId : undefined"
      />
      <p v-if="showHint" :id="hintId" class="text-sm text-foreground/80">
        A tracking ID looks like
        <span class="font-mono">123e4567-e89b-12d3-a456-426614174000</span>.
      </p>
    </div>

    <Button type="submit" class="w-full" :disabled="!valid">
      <Search />
      Track Progress by ID
    </Button>
  </form>
</template>
