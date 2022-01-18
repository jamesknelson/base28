# base28

**Represent your integer database ids as 6-character base-28 strings – an ideal format for URLs.**

- Maximum supported input is 0x0fffffff, i.e. 268,435,455.
- Distributable size is 2.7kb, minified and gzipped.
- *Zero* runtime dependencies.


## Base28 Alphabet

This package's base28 encoding comprises of 8 numbers and 20 characters:

```
BCDFGHJKMN
PQRSTVWXYZ
23456789

or

bcdfghjkmn
pqrstvwxyz
23456789
```

These numbers and letters have been picked according to the criteria:

- Encoded ids should typically look like ids - not words. This is achieved by omitting the vowels.
- It should easy to visually distinguish between all characters - which is why `1` and `0` have been omitted - which can be confused with 'I' and 'O'.
- It should be easy to communicate the characters through voice - thus lower and upper case characters can be used interchangeably.


## Encoding

It's often undesireable for sequential ids to be readily [identified](https://en.wikipedia.org/wiki/German_tank_problem) as such. To avoid this, this encoding [obfuscates](https://stackoverflow.com/questions/8554286/obfuscating-an-id) your ids by applying a reversible pseudo-random looking mapping during encoding and decoding. For example:

```
0 -> GXBSXJ -> 0
1 -> PNPV8H -> 1
2 -> M3BXDH -> 2
3 -> TSP3GS -> 3
```

While this won't prevent any dedicated attackers from iterating through your ids, it will at least provide some protection against casual voyeurs.


## Prior Art

- The obfuscation algorithm is inspired by the answers to [Stack Overflow question](https://stackoverflow.com/questions/8554286/obfuscating-an-id).
- The base28 encoder is based on [cbschuld/uuid-base58](https://github.com/cbschuld/uuid-base58).


## Contributing

Pull requests would be appreciated for:

- If you want to work with inputs greater than 268,435,455, it should be possible to extend this to work with 7 or 8-character strings.

- Configuration of the obfuscator. In particular, it should be possible to pick configure the XOR and ROT numbers through a single large integer.

- Much of the size of this library is due to a bundled, paired-down version of Google's BigInt polyfill. Exporting a second distributable with native BigInt would be a great pull request.


## License

Copyright 2022, James K Nelson. Available for use under MIT License.