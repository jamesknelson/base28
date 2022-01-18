// See: https://stackoverflow.com/questions/8554286/obfuscating-an-id

import { BigInt, toNumber, remainder, multiply } from './bigint'
import { bits, max, rot, xor } from './constant'

const MOD = /*#__PURE__*/ BigInt(max + 1)
const COPRIME = /*#__PURE__*/ BigInt(65521)
// Computed via:
// https://www.wolframalpha.com/input/?i=%2865521*y%29%25268435456%3D1%2C+solve+for+y
const INVERSE = /*#__PURE__*/ BigInt(233836817)

function rotRight(n: number, bits: number, size: number): number {
  const mask = (1 << bits) - 1
  const left = n & mask
  const right = n >> bits
  return (left << (size - bits)) | right
}

export function obfuscate(x: number): number {
  return (
    rotRight(
      toNumber(remainder(multiply(BigInt(x), COPRIME), MOD)),
      rot,
      bits,
    ) ^ xor
  )
}

export function deobfuscate(x: number): number {
  return toNumber(
    remainder(
      multiply(BigInt(rotRight(x ^ xor, bits - rot, bits)), INVERSE),
      MOD,
    ),
  )
}
