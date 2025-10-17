/// <reference types="vitest" />

import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        root: 'src',
        setupFiles: ['./vitest.setup.ts'],
    },
    resolve: {
        alias: [{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }],
    },
})
