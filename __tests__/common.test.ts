import { camelizeKebab, getSuffix } from '../src/lib/common'

test('camelize object', () => {
  const kebab = {
    'test-key1': 3,
    'test-key-2': ['apple', 'banana'],
    'what-ID': 'some value'
  }
  const camel = {
    testKey1: 3,
    testKey2: ['apple', 'banana'],
    whatID: 'some value'
  }
  expect(camelizeKebab(kebab)).toStrictEqual(camel)
})

test('get suffix of valid string', () => {
  const separator = '_'
  const suffix = 'suffix1'
  const str = `example${separator}${suffix}`
  expect(getSuffix(str, separator)).toBe(suffix)
})

test('get suffix of invalid string', () => {
  const separator = '_'
  const str = `examplesuffix1`
  expect(getSuffix(str, separator)).toBeUndefined()
})
