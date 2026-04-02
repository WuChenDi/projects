import { defineConfig } from 'tsdown'

export default defineConfig((options) => ({
  dts: true,
  format: ['esm', 'cjs'],
  entry: ['src/index.ts'],
  clean: !options.watch,
}))
