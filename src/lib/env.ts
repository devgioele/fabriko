const msgMissing = (key: string): string => `Missing env var '${key}'`

export const loadOptionalEnvVar = (key: string): string | undefined =>
  process.env[key]

/**
 * Load an environment variable.
 * @param key The key used to access the environment variable.
 * @returns The value of the environment variable.
 */
export const loadEnvVar = (key: string): string => {
  const envVar = loadOptionalEnvVar(key)
  if (!envVar) {
    throw new Error(msgMissing(key))
  }
  return envVar
}

export const loadOptionalEnvVarArray = (
  key: string,
  separator = ' '
): string[] | undefined => {
  const env = loadOptionalEnvVar(key)
  return env?.split(separator)
}

/**
 * Load an environment variable and parses it as an array to extract
 * multiple values.
 * @param key The key used to access the environment variable.
 * @param separator String used to separate items. Defaults to a whitespace.
 * @returns The parsed array of values.
 */
export const loadEnvVarArray = (key: string, separator = ' '): string[] => {
  const envVar = loadOptionalEnvVarArray(key, separator)
  if (!envVar) {
    throw new Error(msgMissing(key))
  }
  return envVar
}
