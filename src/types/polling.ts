/** A processor used for polling that receives the latest poll response
 * and returns the new polling status.
 *
 * A nominal polling status ranges between the float values `0` and `1`.
 *
 * Any value greater equal than `1` means that the polling completed.
 *
 * Any negative value means that the poll failed.
 * This does not stop the polling, because only a single poll failed and further attempts are potentially made.
 *
 * Throwing an error stops the entire polling.
 */
export type PollingProcessor<T> = (res: T) => number

export enum PollingStatus {
  COMPLETED,
  IN_PROGRESS,
  FAILED
}

export type PollingConfig = {
  interval?: number
  attempts?: number
}
