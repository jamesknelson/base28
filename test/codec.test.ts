import { encode, decode } from '../src/codec'
import { max } from '../src/constant'

test('test that "1" encodes correctly', () => {
  const id = encode(1)
  expect(id).toEqual('PNPV8H')
})

test('test that "1" decodes correctly', () => {
  const id = decode('PNPV8H')
  expect(id).toEqual(1)
})

test('test that max encodes correctly', () => {
  const id = encode(max)
  expect(id).toEqual('HF8HMD')
})

test('test that max decodes correctly', () => {
  const id = decode('HF8HMD')
  expect(id).toEqual(max)
})

test('test first 10,000 positive integers can be encoded and decoded', () => {
  for (let x = 0; x < 10000; x++) {
    const y = encode(x)
    expect(y.length).toBeLessThan(7)
    expect(y).not.toBe(x)
    expect(decode(y)).toEqual(x)
  }
})

test('test that 10,000 positive integers to max can be encoded and decoded', () => {
  for (let x = max; x > max - 10000; x--) {
    const y = encode(x)
    expect(y.length).toBeLessThan(7)
    expect(y).not.toBe(x)
    expect(decode(y)).toEqual(x)
  }
})

test('test that 10,000 random positive integers can be encoded and decoded', () => {
  for (let i = 0; i < 10000; i++) {
    const x = Math.floor(Math.random() * max)
    const y = encode(x)
    expect(y.length).toBeLessThan(7)
    expect(y).not.toBe(x)
    expect(decode(y)).toEqual(x)
  }
})
