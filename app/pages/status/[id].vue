<script setup lang="ts">
import { toast } from 'vue-sonner'

const route = useRoute()

const statusId = computed(() => String(route.params.id ?? ''))
// `?roast=1|0` is set by the start forms. Absent when the user typed a tracking ID by hand.
const roast = computed<boolean | undefined>(() => {
  if (route.query.roast === '1') return true
  if (route.query.roast === '0') return false
  return undefined
})

useHead({ title: 'Analysis status | My Chess Style' })

const { result, error, state, progress, retry } = useAnalysisStatus(statusId, { roast })

watch(error, (message) => {
  if (message) toast.error('Could not load the analysis', { description: message })
})

const fileUpload = computed(() => stageData(result.value?.file_upload))
const game = computed(() => stageData(result.value?.game))
const roastData = computed(() => stageData(result.value?.roasting_user))
</script>

<template>
  <div class="flex flex-col gap-6">
    <StatusProgressCard
      :status-id="statusId"
      :result="result"
      :roast="roast"
      :progress="progress"
      :state="state"
      :error="error"
      @retry="retry"
    />
    <BasicInfoCard v-if="result && 'file_upload' in result" :info="fileUpload" />
    <GamesAnalysisCard v-if="result && 'game' in result" :game="game" />
    <RoastCard v-if="result && 'roasting_user' in result" :roast="roastData" />
  </div>
</template>
