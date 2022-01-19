import { encodeBase28, decodeBase28, validateBase28 } from '../src/base28'

test('correctly validates "BBBBBC" as base28', () => {
  expect(validateBase28('BBBBBC')).toBeTruthy()
})

test('correctly validates "BBBBBBC" as NOT base28', () => {
  expect(validateBase28('BBBBBBC')).not.toBeTruthy()
})

test('correctly validates "BBBBC" as NOT base28', () => {
  expect(validateBase28('BBBBC')).not.toBeTruthy()
})

test('correctly validates "IBBBBC" as NOT base28', () => {
  expect(validateBase28('IBBBBC')).not.toBeTruthy()
})

test('test that "1" encodes to base28 correctly', () => {
  const id = encodeBase28(1)
  expect(id).toEqual('BBBBBC')
})

test('test that "1" decodes to base28 correctly', () => {
  const id = decodeBase28('BBBBBC')
  expect(id).toEqual(1)
})

test('test that "0x0fffffff" encodes to base28 correctly', () => {
  const id = encodeBase28(0x0fffffff)
  expect(id).toEqual('VW2MGV')
})

test('test that "0x0fffffff" decodes to base28 correctly', () => {
  const id = decodeBase28('VW2MGV')
  expect(id).toEqual(0x0fffffff)
})

test('test that base28 encodes and decodes first 10,000 positive integers', () => {
  for (let x = 0; x < 10000; x++) {
    const y = encodeBase28(x)
    expect(y).not.toBe(x)
    expect(decodeBase28(y)).toEqual(x)
  }
})

test('test that base28 encodes and decodes last 10,000 positive integers to 0x0fffffff', () => {
  for (let x = 0x0fffffff; x > 0x0fffffff - 10000; x--) {
    const y = encodeBase28(x)
    expect(y).not.toBe(x)
    expect(y.length).toBeLessThan(7)
    expect(decodeBase28(y)).toEqual(x)
  }
})

test('test that base28 encodes and decodes 10,000 random positive integers', () => {
  for (let i = 0; i < 10000; i++) {
    const x = Math.floor(Math.random() * 0x0fffffff)
    const y = encodeBase28(x)
    expect(y).not.toBe(x)
    expect(y.length).toBeLessThan(7)
    expect(decodeBase28(y)).toEqual(x)
  }
})
