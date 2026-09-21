<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FileUploadData } from '~/types'

defineProps<{ info: FileUploadData | null }>()
</script>

<template>
  <Card class="w-full">
    <CardHeader>
      <CardTitle class="text-xl">Basic Information</CardTitle>
    </CardHeader>
    <CardContent>
      <p v-if="!info" class="text-muted-foreground">No details available for this analysis.</p>
      <dl v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="rounded-lg bg-muted p-4 text-center">
          <dd class="break-all text-xl font-black">{{ info.usernames }}</dd>
          <dt class="text-sm text-muted-foreground">Username</dt>
        </div>
        <div class="rounded-lg bg-muted p-4 text-center">
          <dd class="text-xl font-black">{{ sourceLabel(info.source) }}</dd>
          <dt class="text-sm text-muted-foreground">Source</dt>
        </div>
      </dl>
    </CardContent>
  </Card>
</template>
