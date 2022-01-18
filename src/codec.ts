import { encodeBase28, decodeBase28 } from './base28'
import { max } from './constant'
import { obfuscate, deobfuscate } from './obfuscation'

export const encode = (x: number): string => {
  if (x > max) {
    throw new TypeError('out of range')
  }
  return encodeBase28(obfuscate(x))
}
export const decode = (y: string): number => deobfuscate(decodeBase28(y))
