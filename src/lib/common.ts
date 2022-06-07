import { isArray, isObject, transform } from 'lodash'
import type {
  Errors,
  ResultWithCleanup,
  StringDictionary
} from '../types/common'

/** Returns the decoded payload of the given JWT. */
export const decodeJWT = (jwt: string): string => {
  const payload = jwt.split('.')[1]
  const buff = Buffer.from(payload, 'base64')
  const decoded = buff.toString('utf-8')
  return decoded
}

export const kebabToCamel = (s: string): string =>
  s.replace(/-./g, x => x[1].toUpperCase())

const transformKeys = (
  o: object,
  keyTransformer: (key: string) => string
): object =>
  transform(o, (acc: StringDictionary, value, key, target) => {
    const camelKey = isArray(target) ? key : keyTransformer(key)
    acc[camelKey] = isObject(value)
      ? transformKeys(value, keyTransformer)
      : value
  })

export const camelizeKebab = (o: object): object =>
  transformKeys(o, kebabToCamel)

/** Returns the first group of the first match. */
export const regexMatches = (
  str: string,
  regex: RegExp
): string | undefined => {
  const groups = str.match(regex)
  return groups?.[1]
}

export const getSuffix = (
  suffixedName: string,
  separator: string
): string | undefined => {
  const re = new RegExp(`.*${separator}(.*)`, 'u')
  const suffix = regexMatches(suffixedName, re)
  return suffix
}

/** Returns the suffixed tileset name as a new string. */
export const addSuffix = (
  name: string,
  version: number,
  separator: string
): string => {
  return `${name}${separator}${version}`
}

/**
 * @returns Whether the given string starts with any of the strings in the given array.
 */
export const startsWithAny = (str: string, starters: string[]): boolean => {
  for (const starter of starters) {
    if (str.startsWith(starter)) {
      return true
    }
  }
  return false
}

export const compileErrors = (
  errorMessages: Array<string | null | undefined>
): Errors =>
  errorMessages.reduce(
    (current, newMsg) => {
      if (!newMsg) {
        return current
      }
      const newNumber = current.amount + 1
      return {
        message: `${current.message}Error ${newNumber}: ${newMsg}\n`,
        amount: newNumber
      }
    },
    { message: '', amount: 0 }
  )

export const collectResultsWithCleanup = <T>(
  resultsWithCleanup: Array<ResultWithCleanup<T>>
): ResultWithCleanup<T[]> => {
  // Form a cleanup function that calls all the cleanup functions
  const cleanupAll = async (): Promise<void> => {
    const cleanups = resultsWithCleanup.map(async rwc => await rwc[1]())
    await Promise.all(cleanups)
  }
  // Collect values
  const results = resultsWithCleanup.map(rwc => rwc[0])
  return [results, cleanupAll]
}

export const nanos = (): number => {
  const hrTime = process.hrtime()
  return hrTime[0] * 1_000_000_000 + hrTime[1]
}
