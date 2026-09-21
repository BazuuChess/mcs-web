<script setup lang="ts">
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const model = defineModel<boolean>({ default: false })
// Each form has its own toggle; a per-instance id keeps the label/switch pairs distinct.
const id = useId()
</script>

<template>
  <div class="flex items-center gap-3">
    <Switch :id="id" v-model="model" />
    <Label :for="id" class="cursor-pointer font-normal">
      Include AI roast &amp; commentary (prepare yourself!)
    </Label>
  </div>
</template>
