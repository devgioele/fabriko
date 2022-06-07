import { setInterval } from 'timers/promises'
import type { PollingConfig, PollingProcessor } from '../types/polling'
import { PollingStatus } from '../types/polling'

const defaultConfig: Required<PollingConfig> = {
  attempts: 3,
  interval: 5000
}

/**
 * Polls an endpoint with the given fetcher until the given processor deems the polling as completed or failed.
 *
 * @param fetcher The fetcher used to make polls.
 * @param processor The processor to which the poll response is passed.
 * @param attempts How many attempts are made to make a poll.
 * If the number of attempts is exceeded, the polling is stopped.
 * @param interval How many milliseconds are waited between polls.
 */
export const progressPolling = async <T>(
  fetcher: () => Promise<T>,
  processor: PollingProcessor<T>,
  config: PollingConfig
): Promise<void> => {
  const parsedConfig = {
    ...defaultConfig,
    ...config
  }
  const task = async (): Promise<PollingStatus> => {
    const response = await fetcher()
    const status = processor(response)
    if (status >= 1) {
      return PollingStatus.COMPLETED
    } else if (status >= 0) {
      return PollingStatus.IN_PROGRESS
    } else {
      return PollingStatus.FAILED
    }
  }
  intervalLoop: for await (const _ of setInterval(parsedConfig.interval)) {
    let failedAttempts = 0
    const attemptsExceeded = (): boolean =>
      failedAttempts >= parsedConfig.attempts
    attemptsLoop: while (!attemptsExceeded()) {
      const status = await task()
      switch (status) {
        case PollingStatus.COMPLETED:
          // Stop polling
          break intervalLoop
        case PollingStatus.IN_PROGRESS:
          failedAttempts = 0
          // Wait until next poll
          break attemptsLoop
        case PollingStatus.FAILED:
          failedAttempts += 1
          break
      }
    }
    if (attemptsExceeded()) {
      throw new Error('Polling failed due to too many failed attempts.')
    }
  }
}
