// We'll exclude the leftmost 4 bits, as including them would result in our
// base-28 numbers requiring more than 6 digits.
export const max = 0x0fffffff
export const bits = 28

// These are configurable, but they must each be lower than the maximum number
export const rot = 7
export const xor = 79301298
