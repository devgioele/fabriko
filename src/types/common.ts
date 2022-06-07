export type StringDictionary<T = unknown> = {
  [index: string]: T
}

export type Errors = {
  message: string
  amount: number
}

export type ResultWithCleanup<T> = [T, () => Promise<void>]
