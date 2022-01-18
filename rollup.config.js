import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'

const env = process.env.NODE_ENV
const format = process.env.FORMAT

const config = {
  input: 'dist/ts/index.js',
  output: {
    file:
      format === 'es'
        ? 'dist/opaque-id.js'
        : env === 'production'
        ? 'dist/umd/opaque-id.min.js'
        : 'dist/umd/opaque-id.js',
    format: format,
    name: 'OpaqueId',
    sourcemap: true,
  },
  external: format === 'umd' ? [] : ['semver'],
  plugins: [
    nodeResolve({
      jsnext: true,
      main: true,
    }),
    commonjs(),
  ],
}

if (env === 'production') {
  config.plugins.unshift(
    terser({
      toplevel: true,
      ecma: 2015,
      module: true,
      toplevel: true,
    }),
  )
}

export default config
