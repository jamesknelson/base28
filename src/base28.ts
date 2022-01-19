// Based on https://github.com/cbschuld/uuid-base58/blob/master/src/uuid58.ts

const BASE28_ALPHABET = 'BCDFGHJKMNPQRSTVWXYZ23456789'

export const validateBase28 = (input: string) =>
  new RegExp('^[' + BASE28_ALPHABET + ']{6}$').test(input)

export const encodeBase28 = (b: number): string => {
  const alphabetLength = BASE28_ALPHABET.length
  let u58 = ''
  do {
    const index = b % alphabetLength
    u58 = BASE28_ALPHABET[index] + u58
    b = Math.floor(b / alphabetLength)
  } while (b > 0)
  return u58.padStart(6, BASE28_ALPHABET[0])
}

export const decodeBase28 = (b28: string): number => {
  const parts = Array.from(b28.toUpperCase()).map((x: string) =>
    BASE28_ALPHABET.indexOf(x),
  )
  if (parts.some((inc) => inc < 0) || b28.trim() === '') {
    throw new TypeError('not base28')
  }
  const max = b28.length - 1
  return parts.reduce(
    (total, val, index) =>
      (total + val) * (index < max ? BASE28_ALPHABET.length : 1),
    0,
  )
}
