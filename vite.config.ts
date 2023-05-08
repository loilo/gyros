import { defineConfig } from 'vitest/config'

export default defineConfig({
  build: {
    lib: {
      entry: './src/gyros.ts',
      fileName: 'gyros',
      formats: ['es']
    },
    rollupOptions: {
      external: ['php-parser', 'magic-string']
    }
  },
  test: {
    include: ['./test/**/*.spec.ts']
  }
})
