import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExternalUserForm from '~/components/ExternalUserForm.vue'
import TrackProgressForm from '~/components/TrackProgressForm.vue'
import UploadPgnForm from '~/components/UploadPgnForm.vue'

const STATUS_ID = '123e4567-e89b-12d3-a456-426614174000'

const mocks = vi.hoisted(() => ({
  startPgnUpload: vi.fn(),
  startExternalUser: vi.fn(),
  navigateTo: vi.fn(),
  toastError: vi.fn(),
}))

mockNuxtImport('useAnalysisApi', () => () => ({
  startPgnUpload: mocks.startPgnUpload,
  startExternalUser: mocks.startExternalUser,
  fetchStatus: vi.fn(),
}))
mockNuxtImport('navigateTo', () => mocks.navigateTo)

vi.mock('vue-sonner', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-sonner')>()),
  toast: { error: mocks.toastError, success: vi.fn() },
}))

beforeEach(() => {
  mocks.startPgnUpload.mockReset().mockResolvedValue({ status_id: STATUS_ID })
  mocks.startExternalUser.mockReset().mockResolvedValue({ status_id: STATUS_ID })
  mocks.navigateTo.mockReset()
  mocks.toastError.mockReset()
})

const button = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))!

async function chooseFile(wrapper: VueWrapper, file: File) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
}

describe('UploadPgnForm', () => {
  const pgn = new File(['1. e4 e5'], 'games.pgn')

  it('is disabled until both a file and a username are provided', async () => {
    const wrapper = await mountSuspended(UploadPgnForm)
    const submit = button(wrapper, 'Analyze PGN File')
    expect(submit.attributes('disabled')).toBeDefined()

    await wrapper.find('input[placeholder="Enter your chess username"]').setValue('magnus')
    expect(submit.attributes('disabled')).toBeDefined()

    await chooseFile(wrapper, pgn)
    expect(submit.attributes('disabled')).toBeUndefined()
  })

  it('ignores a whitespace-only username', async () => {
    const wrapper = await mountSuspended(UploadPgnForm)
    await chooseFile(wrapper, pgn)
    await wrapper.find('input[placeholder="Enter your chess username"]').setValue('   ')
    expect(button(wrapper, 'Analyze PGN File').attributes('disabled')).toBeDefined()
  })

  it('uploads the file and opens the status page (roast off)', async () => {
    const wrapper = await mountSuspended(UploadPgnForm)
    await chooseFile(wrapper, pgn)
    await wrapper.find('input[placeholder="Enter your chess username"]').setValue('magnus')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.startPgnUpload).toHaveBeenCalledWith({
      file: pgn,
      usernames: 'magnus',
      includeRoast: false,
    })
    expect(mocks.navigateTo).toHaveBeenCalledWith({
      path: `/status/${STATUS_ID}`,
      query: { roast: '0' },
    })
  })

  it('passes the roast choice on to the status page', async () => {
    const wrapper = await mountSuspended(UploadPgnForm)
    await chooseFile(wrapper, pgn)
    await wrapper.find('input[placeholder="Enter your chess username"]').setValue('magnus')
    await wrapper.find('[role="switch"]').trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.startPgnUpload).toHaveBeenCalledWith(
      expect.objectContaining({ includeRoast: true }),
    )
    expect(mocks.navigateTo).toHaveBeenCalledWith({
      path: `/status/${STATUS_ID}`,
      query: { roast: '1' },
    })
  })

  it('shows the backend error and stays on the page when the upload fails', async () => {
    mocks.startPgnUpload.mockRejectedValue({
      data: { detail: [{ msg: 'Field required' }] },
      status: 422,
    })
    const wrapper = await mountSuspended(UploadPgnForm)
    await chooseFile(wrapper, pgn)
    await wrapper.find('input[placeholder="Enter your chess username"]').setValue('magnus')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.toastError).toHaveBeenCalledWith('Could not start the analysis', {
      description: 'Field required',
    })
    expect(mocks.navigateTo).not.toHaveBeenCalled()
    expect(button(wrapper, 'Analyze PGN File').attributes('disabled')).toBeUndefined()
  })
})

describe('ExternalUserForm', () => {
  it('is disabled until a username is entered', async () => {
    const wrapper = await mountSuspended(ExternalUserForm)
    const submit = button(wrapper, 'Analyze Games')
    expect(submit.attributes('disabled')).toBeDefined()

    await wrapper.find('input[placeholder="Enter your username"]').setValue('hikaru')
    expect(submit.attributes('disabled')).toBeUndefined()
  })

  it('defaults the platform to Chess.com', async () => {
    const wrapper = await mountSuspended(ExternalUserForm)
    expect(wrapper.text()).toContain('Chess.com')

    await wrapper.find('input[placeholder="Enter your username"]').setValue('hikaru')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.startExternalUser).toHaveBeenCalledWith({
      username: 'hikaru',
      platform: 'chess.com',
      includeRoast: false,
    })
    expect(mocks.navigateTo).toHaveBeenCalledWith({
      path: `/status/${STATUS_ID}`,
      query: { roast: '0' },
    })
  })

  it('shows the "user not found" message from the backend', async () => {
    mocks.startExternalUser.mockRejectedValue({
      data: { message: 'User has not been found on Chess.com' },
      status: 404,
    })
    const wrapper = await mountSuspended(ExternalUserForm)
    await wrapper.find('input[placeholder="Enter your username"]').setValue('nobody')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.toastError).toHaveBeenCalledWith('Could not start the analysis', {
      description: 'User has not been found on Chess.com',
    })
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('gives each roast toggle its own id', async () => {
    const [a, b] = await Promise.all([
      mountSuspended(ExternalUserForm),
      mountSuspended(UploadPgnForm),
    ])
    const idA = a.find('[role="switch"]').attributes('id')
    const idB = b.find('[role="switch"]').attributes('id')
    expect(idA).toBeTruthy()
    expect(idA).not.toBe(idB)
  })
})

describe('TrackProgressForm', () => {
  const input = (wrapper: VueWrapper) => wrapper.find('input')

  it('is disabled for an empty or invalid tracking id, and explains the format', async () => {
    const wrapper = await mountSuspended(TrackProgressForm)
    const submit = button(wrapper, 'Track Progress by ID')
    expect(submit.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('A tracking ID looks like')

    await input(wrapper).setValue('CGA-1234567890-ABC123')
    expect(submit.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('A tracking ID looks like')
  })

  it('opens the status page for a valid id (lowercased and trimmed)', async () => {
    const wrapper = await mountSuspended(TrackProgressForm)
    await input(wrapper).setValue(`  ${STATUS_ID.toUpperCase()}  `)
    expect(button(wrapper, 'Track Progress by ID').attributes('disabled')).toBeUndefined()

    await wrapper.find('form').trigger('submit')
    // No roast flag: the status page has to fall back to its grace window.
    expect(mocks.navigateTo).toHaveBeenCalledWith(`/status/${STATUS_ID}`)
  })

  it('does not navigate for an invalid id', async () => {
    const wrapper = await mountSuspended(TrackProgressForm)
    await input(wrapper).setValue('nope')
    await wrapper.find('form').trigger('submit')
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })
})
