// Copyright 2018 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the “License”);
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// <https://apache.org/licenses/LICENSE-2.0>.
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an “AS IS” BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

export function BigInt(arg: number): JSBI {
  return __oneDigit(arg, false)
}

// Equivalent of "Number(my_bigint)" in the native implementation.
// TODO: add more tests
export function toNumber(x: JSBI): number {
  const xLength = x.length
  if (xLength === 0) return 0
  if (xLength === 1) {
    const value = x.__unsignedDigit(0)
    return x.sign ? -value : value
  }
  const xMsd = x.__digit(xLength - 1)
  const msdLeadingZeros = __clz30(xMsd)
  const xBitLength = xLength * 30 - msdLeadingZeros
  if (xBitLength > 1024) return x.sign ? -Infinity : Infinity
  let exponent = xBitLength - 1
  let currentDigit = xMsd
  let digitIndex = xLength - 1
  const shift = msdLeadingZeros + 3
  let mantissaHigh = shift === 32 ? 0 : currentDigit << shift
  mantissaHigh >>>= 12
  const mantissaHighBitsUnset = shift - 12
  let mantissaLow = shift >= 12 ? 0 : currentDigit << (20 + shift)
  let mantissaLowBitsUnset = 20 + shift
  if (mantissaHighBitsUnset > 0 && digitIndex > 0) {
    digitIndex--
    currentDigit = x.__digit(digitIndex)
    mantissaHigh |= currentDigit >>> (30 - mantissaHighBitsUnset)
    mantissaLow = currentDigit << (mantissaHighBitsUnset + 2)
    mantissaLowBitsUnset = mantissaHighBitsUnset + 2
  }
  while (mantissaLowBitsUnset > 0 && digitIndex > 0) {
    digitIndex--
    currentDigit = x.__digit(digitIndex)
    if (mantissaLowBitsUnset >= 30) {
      mantissaLow |= currentDigit << (mantissaLowBitsUnset - 30)
    } else {
      mantissaLow |= currentDigit >>> (30 - mantissaLowBitsUnset)
    }
    mantissaLowBitsUnset -= 30
  }
  const rounding = __decideRounding(
    x,
    mantissaLowBitsUnset,
    digitIndex,
    currentDigit,
  )
  if (rounding === 1 || (rounding === 0 && (mantissaLow & 1) === 1)) {
    mantissaLow = (mantissaLow + 1) >>> 0
    if (mantissaLow === 0) {
      // Incrementing mantissaLow overflowed.
      mantissaHigh++
      if (mantissaHigh >>> 20 !== 0) {
        // Incrementing mantissaHigh overflowed.
        mantissaHigh = 0
        exponent++
        if (exponent > 1023) {
          // Incrementing the exponent overflowed.
          return x.sign ? -Infinity : Infinity
        }
      }
    }
  }
  const signBit = x.sign ? 1 << 31 : 0
  exponent = (exponent + 0x3ff) << 20
  __kBitConversionInts[1] = signBit | exponent | mantissaHigh
  __kBitConversionInts[0] = mantissaLow
  return __kBitConversionDouble[0]
}

// Operations.
export function multiply(x: JSBI, y: JSBI): JSBI {
  if (x.length === 0) return x
  if (y.length === 0) return y
  let resultLength = x.length + y.length
  if (x.__clzmsd() + y.__clzmsd() >= 30) {
    resultLength--
  }
  const result = new JSBI(resultLength, x.sign !== y.sign)
  result.__initializeDigits()
  for (let i = 0; i < x.length; i++) {
    __multiplyAccumulate(y, x.__digit(i), result, i)
  }
  return result.__trim()
}

export function remainder(x: JSBI, y: JSBI): JSBI {
  if (y.length === 0) throw new RangeError('Division by zero')
  if (__absoluteCompare(x, y) < 0) return x
  const divisor = y.__unsignedDigit(0)
  if (y.length === 1 && divisor <= 0x7fff) {
    if (divisor === 1) return __zero()
    const remainderDigit = __absoluteModSmall(x, divisor)
    if (remainderDigit === 0) return __zero()
    return __oneDigit(remainderDigit, x.sign)
  }
  const remainder = __absoluteDivLarge(x, y, false, true)
  remainder.sign = x.sign
  return remainder.__trim()
}

//---

class JSBI extends Array {
  constructor(length: number, public sign: boolean) {
    super(length)
    // Explicitly set the prototype as per
    // https://github.com/Microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, JSBI.prototype)
  }

  __trim(): this {
    let newLength = this.length
    let last = this[newLength - 1]
    while (last === 0) {
      newLength--
      last = this[newLength - 1]
      this.pop()
    }
    if (newLength === 0) this.sign = false
    return this
  }

  __initializeDigits(): void {
    for (let i = 0; i < this.length; i++) {
      this[i] = 0
    }
  }

  __clzmsd(): number {
    return __clz30(this.__digit(this.length - 1))
  }

  // TODO: work on full digits, like __inplaceSub?
  __inplaceAdd(summand: JSBI, startIndex: number, halfDigits: number): number {
    let carry = 0
    for (let i = 0; i < halfDigits; i++) {
      const sum =
        this.__halfDigit(startIndex + i) + summand.__halfDigit(i) + carry
      carry = sum >>> 15
      this.__setHalfDigit(startIndex + i, sum & 0x7fff)
    }
    return carry
  }

  __inplaceSub(
    subtrahend: JSBI,
    startIndex: number,
    halfDigits: number,
  ): number {
    const fullSteps = (halfDigits - 1) >>> 1
    let borrow = 0
    if (startIndex & 1) {
      // this:   [..][..][..]
      // subtr.:   [..][..]
      startIndex >>= 1
      let current = this.__digit(startIndex)
      let r0 = current & 0x7fff
      let i = 0
      for (; i < fullSteps; i++) {
        const sub = subtrahend.__digit(i)
        const r15 = (current >>> 15) - (sub & 0x7fff) - borrow
        borrow = (r15 >>> 15) & 1
        this.__setDigit(startIndex + i, ((r15 & 0x7fff) << 15) | (r0 & 0x7fff))
        current = this.__digit(startIndex + i + 1)
        r0 = (current & 0x7fff) - (sub >>> 15) - borrow
        borrow = (r0 >>> 15) & 1
      }
      // Unrolling the last iteration gives a 5% performance benefit!
      const sub = subtrahend.__digit(i)
      const r15 = (current >>> 15) - (sub & 0x7fff) - borrow
      borrow = (r15 >>> 15) & 1
      this.__setDigit(startIndex + i, ((r15 & 0x7fff) << 15) | (r0 & 0x7fff))
      const subTop = sub >>> 15
      if (startIndex + i + 1 >= this.length) {
        throw new RangeError('out of bounds')
      }
      if ((halfDigits & 1) === 0) {
        current = this.__digit(startIndex + i + 1)
        r0 = (current & 0x7fff) - subTop - borrow
        borrow = (r0 >>> 15) & 1
        this.__setDigit(
          startIndex + subtrahend.length,
          (current & 0x3fff8000) | (r0 & 0x7fff),
        )
      }
    } else {
      startIndex >>= 1
      let i = 0
      for (; i < subtrahend.length - 1; i++) {
        const current = this.__digit(startIndex + i)
        const sub = subtrahend.__digit(i)
        const r0 = (current & 0x7fff) - (sub & 0x7fff) - borrow
        borrow = (r0 >>> 15) & 1
        const r15 = (current >>> 15) - (sub >>> 15) - borrow
        borrow = (r15 >>> 15) & 1
        this.__setDigit(startIndex + i, ((r15 & 0x7fff) << 15) | (r0 & 0x7fff))
      }
      const current = this.__digit(startIndex + i)
      const sub = subtrahend.__digit(i)
      const r0 = (current & 0x7fff) - (sub & 0x7fff) - borrow
      borrow = (r0 >>> 15) & 1
      let r15 = 0
      if ((halfDigits & 1) === 0) {
        r15 = (current >>> 15) - (sub >>> 15) - borrow
        borrow = (r15 >>> 15) & 1
      }
      this.__setDigit(startIndex + i, ((r15 & 0x7fff) << 15) | (r0 & 0x7fff))
    }
    return borrow
  }

  __inplaceRightShift(shift: number): void {
    if (shift === 0) return
    let carry = this.__digit(0) >>> shift
    const last = this.length - 1
    for (let i = 0; i < last; i++) {
      const d = this.__digit(i + 1)
      this.__setDigit(i, ((d << (30 - shift)) & 0x3fffffff) | carry)
      carry = d >>> shift
    }
    this.__setDigit(last, carry)
  }

  // Digit helpers.
  __digit(i: number): number {
    return this[i]
  }
  __unsignedDigit(i: number): number {
    return this[i] >>> 0
  }
  __setDigit(i: number, digit: number): void {
    this[i] = digit | 0
  }
  __halfDigitLength(): number {
    const len = this.length
    if (this.__unsignedDigit(len - 1) <= 0x7fff) return len * 2 - 1
    return len * 2
  }
  __halfDigit(i: number): number {
    return (this[i >>> 1] >>> ((i & 1) * 15)) & 0x7fff
  }
  __setHalfDigit(i: number, value: number): void {
    const digitIndex = i >>> 1
    const previous = this.__digit(digitIndex)
    const updated =
      i & 1
        ? (previous & 0x7fff) | (value << 15)
        : (previous & 0x3fff8000) | (value & 0x7fff)
    this.__setDigit(digitIndex, updated)
  }
}

function __zero(): JSBI {
  return new JSBI(0, false)
}

function __oneDigit(value: number, sign: boolean): JSBI {
  const result = new JSBI(1, sign)
  result.__setDigit(0, value)
  return result
}

function __decideRounding(
  x: JSBI,
  mantissaBitsUnset: number,
  digitIndex: number,
  currentDigit: number,
): 1 | 0 | -1 {
  if (mantissaBitsUnset > 0) return -1
  let topUnconsumedBit
  if (mantissaBitsUnset < 0) {
    topUnconsumedBit = -mantissaBitsUnset - 1
  } else {
    // {currentDigit} fit the mantissa exactly; look at the next digit.
    if (digitIndex === 0) return -1
    digitIndex--
    currentDigit = x.__digit(digitIndex)
    topUnconsumedBit = 29
  }
  // If the most significant remaining bit is 0, round down.
  let mask = 1 << topUnconsumedBit
  if ((currentDigit & mask) === 0) return -1
  // If any other remaining bit is set, round up.
  mask -= 1
  if ((currentDigit & mask) !== 0) return 1
  while (digitIndex > 0) {
    digitIndex--
    if (x.__digit(digitIndex) !== 0) return 1
  }
  return 0
}

function __absoluteCompare(x: JSBI, y: JSBI) {
  const diff = x.length - y.length
  if (diff !== 0) return diff
  let i = x.length - 1
  while (i >= 0 && x.__digit(i) === y.__digit(i)) i--
  if (i < 0) return 0
  return x.__unsignedDigit(i) > y.__unsignedDigit(i) ? 1 : -1
}

function __multiplyAccumulate(
  multiplicand: JSBI,
  multiplier: number,
  accumulator: JSBI,
  accumulatorIndex: number,
): void {
  if (multiplier === 0) return
  const m2Low = multiplier & 0x7fff
  const m2High = multiplier >>> 15
  let carry = 0
  let high = 0
  for (let i = 0; i < multiplicand.length; i++, accumulatorIndex++) {
    let acc = accumulator.__digit(accumulatorIndex)
    const m1 = multiplicand.__digit(i)
    const m1Low = m1 & 0x7fff
    const m1High = m1 >>> 15
    const rLow = Math.imul(m1Low, m2Low)
    const rMid1 = Math.imul(m1Low, m2High)
    const rMid2 = Math.imul(m1High, m2Low)
    const rHigh = Math.imul(m1High, m2High)
    acc += high + rLow + carry
    carry = acc >>> 30
    acc &= 0x3fffffff
    acc += ((rMid1 & 0x7fff) << 15) + ((rMid2 & 0x7fff) << 15)
    carry += acc >>> 30
    high = rHigh + (rMid1 >>> 15) + (rMid2 >>> 15)
    accumulator.__setDigit(accumulatorIndex, acc & 0x3fffffff)
  }
  for (; carry !== 0 || high !== 0; accumulatorIndex++) {
    let acc = accumulator.__digit(accumulatorIndex)
    acc += carry + high
    high = 0
    carry = acc >>> 30
    accumulator.__setDigit(accumulatorIndex, acc & 0x3fffffff)
  }
}

function __internalMultiplyAdd(
  source: JSBI,
  factor: number,
  summand: number,
  n: number,
  result: JSBI,
): void {
  let carry = summand
  let high = 0
  for (let i = 0; i < n; i++) {
    const digit = source.__digit(i)
    const rx = Math.imul(digit & 0x7fff, factor)
    const ry = Math.imul(digit >>> 15, factor)
    const r = rx + ((ry & 0x7fff) << 15) + high + carry
    carry = r >>> 30
    high = ry >>> 15
    result.__setDigit(i, r & 0x3fffffff)
  }
  if (result.length > n) {
    result.__setDigit(n++, carry + high)
    while (n < result.length) {
      result.__setDigit(n++, 0)
    }
  } else {
    if (carry + high !== 0) throw new Error('implementation bug')
  }
}

function __absoluteModSmall(x: JSBI, divisor: number): number {
  let remainder = 0
  for (let i = x.length * 2 - 1; i >= 0; i--) {
    const input = ((remainder << 15) | x.__halfDigit(i)) >>> 0
    remainder = input % divisor | 0
  }
  return remainder
}

function __absoluteDivLarge(
  dividend: JSBI,
  divisor: JSBI,
  wantQuotient: false,
  wantRemainder: false,
): undefined
function __absoluteDivLarge(
  dividend: JSBI,
  divisor: JSBI,
  wantQuotient: true,
  wantRemainder: true,
): { quotient: JSBI; remainder: JSBI }
function __absoluteDivLarge(
  dividend: JSBI,
  divisor: JSBI,
  wantQuotient: boolean,
  wantRemainder: boolean,
): JSBI
function __absoluteDivLarge(
  dividend: JSBI,
  divisor: JSBI,
  wantQuotient: boolean,
  wantRemainder: boolean,
): { quotient: JSBI; remainder: JSBI } | JSBI | undefined {
  const n = divisor.__halfDigitLength()
  const n2 = divisor.length
  const m = dividend.__halfDigitLength() - n
  let q = null
  if (wantQuotient) {
    q = new JSBI((m + 2) >>> 1, false)
    q.__initializeDigits()
  }
  const qhatv = new JSBI((n + 2) >>> 1, false)
  qhatv.__initializeDigits()
  // D1.
  const shift = __clz15(divisor.__halfDigit(n - 1))
  if (shift > 0) {
    divisor = __specialLeftShift(divisor, shift, 0 /* add no digits*/)
  }
  const u = __specialLeftShift(dividend, shift, 1 /* add one digit */)
  // D2.
  const vn1 = divisor.__halfDigit(n - 1)
  let halfDigitBuffer = 0
  for (let j = m; j >= 0; j--) {
    // D3.
    let qhat = 0x7fff
    const ujn = u.__halfDigit(j + n)
    if (ujn !== vn1) {
      const input = ((ujn << 15) | u.__halfDigit(j + n - 1)) >>> 0
      qhat = (input / vn1) | 0
      let rhat = input % vn1 | 0
      const vn2 = divisor.__halfDigit(n - 2)
      const ujn2 = u.__halfDigit(j + n - 2)
      while (Math.imul(qhat, vn2) >>> 0 > ((rhat << 16) | ujn2) >>> 0) {
        qhat--
        rhat += vn1
        if (rhat > 0x7fff) break
      }
    }
    // D4.
    __internalMultiplyAdd(divisor, qhat, 0, n2, qhatv)
    let c = u.__inplaceSub(qhatv, j, n + 1)
    if (c !== 0) {
      c = u.__inplaceAdd(divisor, j, n)
      u.__setHalfDigit(j + n, (u.__halfDigit(j + n) + c) & 0x7fff)
      qhat--
    }
    if (wantQuotient) {
      if (j & 1) {
        halfDigitBuffer = qhat << 15
      } else {
        // TODO make this statically determinable
        ;(q as JSBI).__setDigit(j >>> 1, halfDigitBuffer | qhat)
      }
    }
  }
  if (wantRemainder) {
    u.__inplaceRightShift(shift)
    if (wantQuotient) {
      return { quotient: q as JSBI, remainder: u }
    }
    return u
  }
  if (wantQuotient) return q as JSBI
  // TODO find a way to make this statically unreachable?
  throw new Error('unreachable')
}

function __clz15(value: number): number {
  return __clz30(value) - 15
}

function __specialLeftShift(x: JSBI, shift: number, addDigit: 0 | 1): JSBI {
  const n = x.length
  const resultLength = n + addDigit
  const result = new JSBI(resultLength, false)
  if (shift === 0) {
    for (let i = 0; i < n; i++) result.__setDigit(i, x.__digit(i))
    if (addDigit > 0) result.__setDigit(n, 0)
    return result
  }
  let carry = 0
  for (let i = 0; i < n; i++) {
    const d = x.__digit(i)
    result.__setDigit(i, ((d << shift) & 0x3fffffff) | carry)
    carry = d >>> (30 - shift)
  }
  if (addDigit > 0) {
    result.__setDigit(n, carry)
  }
  return result
}

function __clz30(x: number): number {
  return Math.clz32(x) - 2
}

const __kBitConversionBuffer = /*#__PURE__*/ new ArrayBuffer(8)
const __kBitConversionDouble = /*#__PURE__*/ new Float64Array(
  __kBitConversionBuffer,
)
const __kBitConversionInts = /*#__PURE__*/ new Int32Array(
  __kBitConversionBuffer,
)
