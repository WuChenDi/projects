import { defineConfig } from 'tsdown'

export default defineConfig((options) => ({
  dts: true,
  format: ['esm', 'cjs'],
  entry: ['src/node.ts', 'src/web.ts', 'src/utils.ts'],
  clean: !options.watch,
}))
