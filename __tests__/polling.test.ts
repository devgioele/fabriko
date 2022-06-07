import { progressPolling } from '../src/lib/polling'
import type { PollingProcessor } from '../src/types/polling'

type SimpleStatusResponse = { status: number }

test('complete polling with 2 fetches', async () => {
  let fetches = 0
  let status = 0
  const fetcher = async (): Promise<SimpleStatusResponse> => {
    fetches += 1
    status += 0.5
    return { status }
  }
  const processor: PollingProcessor<SimpleStatusResponse> = res => res.status
  await progressPolling(fetcher, processor, { interval: 0 })
  expect(fetches).toBe(2)
})

test.each([[0], [1], [2]])(
  '%d max attempts causes %d failed fetches',
  async attempts => {
    let fetches = 0
    const fetcher = async (): Promise<void> => {
      fetches += 1
    }
    const processor: PollingProcessor<void> = _res => {
      // Let polls always fail
      return -1
    }
    // Expect an error, because the maximum number of failed attempts is reached
    await expect(
      progressPolling(fetcher, processor, { attempts, interval: 0 })
    ).rejects.toBeDefined()
    expect(fetches).toBe(attempts)
  }
)
