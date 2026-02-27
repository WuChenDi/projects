import { defineConfig } from 'tsdown'

export default defineConfig((options) => ({
  dts: true,
  format: ['esm'],
  entry: ['./src/index.ts'],
  target: 'ES2018',
  clean: !options.watch,
}))
