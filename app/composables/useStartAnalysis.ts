import { toast } from 'vue-sonner'
import type { StartAnalysisResponse } from '~/types'

/**
 * Shared submit flow for the start forms: run the request, then open the status page. The roast
 * choice travels in the query string because the status endpoint doesn't report it.
 */
export function useStartAnalysis() {
  const submitting = ref(false)

  async function start(request: () => Promise<StartAnalysisResponse>, includeRoast: boolean) {
    if (submitting.value) return
    submitting.value = true
    try {
      const { status_id } = await request()
      await navigateTo({ path: `/status/${status_id}`, query: { roast: includeRoast ? '1' : '0' } })
    } catch (err) {
      toast.error('Could not start the analysis', { description: parseApiError(err) })
    } finally {
      submitting.value = false
    }
  }

  return { submitting, start }
}
