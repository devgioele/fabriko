import * as path from 'path'
import { test, expect } from '@jest/globals'
import { parseConfig } from '../src/input'

test('load config', () => {
  const configPath = path.resolve(__dirname, './mock-config.yml')
  // Set secrets context
  process.env['SECRETS_CONTEXT'] = '{}'
  const config = parseConfig(configPath)
  expect(config?.groupBy).toContain('ConsVAT')
})
