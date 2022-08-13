import * as path from 'path'
import { test, expect } from '@jest/globals'
import { parseConfig } from '../src/input'

test('load config', () => {
  const configPath = path.resolve(__dirname, './mock-config.yml')
  const secrets = {}
  const config = parseConfig(configPath, secrets)
  expect(config?.groupBy).toContain('ConsVAT')
})
