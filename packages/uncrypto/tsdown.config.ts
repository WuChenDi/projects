import { defineConfig } from 'tsdown'

export default defineConfig((options) => ({
  dts: true,
  format: ['esm', 'cjs'],
  entry: ['src/crypto.node.ts', 'src/crypto.web.ts'],
  clean: !options.watch,
}))
