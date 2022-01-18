import { max } from '../src/constant'
import { obfuscate, deobfuscate } from '../src/obfuscation'

test('obfuscation and inverse over first 10,000 ids', () => {
  for (let x = 0; x < 10000; x++) {
    const y = obfuscate(x)
    expect(y).not.toBe(x)
    expect(deobfuscate(y)).toBe(x)
  }
})

test('obfuscation and inverse over last 10,000 ids', () => {
  for (let x = max; x > max - 10000; x--) {
    const y = obfuscate(x)
    expect(y).not.toBe(x)
    expect(deobfuscate(y)).toBe(x)
  }
})

test('obfuscation and inverse over 100,000 pseudo-random ids', () => {
  for (let i = 0; i < 100000; i++) {
    const x = Math.floor(Math.random() * max)
    const y = obfuscate(x)
    expect(y).not.toBe(x)
    expect(deobfuscate(y)).toBe(x)
  }
})
