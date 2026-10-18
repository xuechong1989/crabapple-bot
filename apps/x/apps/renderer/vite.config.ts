import fs from "node:fs"
import path from "path"
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// mermaid -> langium deep-imports `vscode-jsonrpc/lib/common/*`. Once pnpm hoists
// vscode-jsonrpc@9 to the store root, its exports map blocks those specifiers and
// the production build fails. Point them at the real files instead.
let vscodeJsonrpcRoot: string | null = null
try {
  vscodeJsonrpcRoot = fs.realpathSync(
    path.resolve(__dirname, "../../node_modules/.pnpm/node_modules/vscode-jsonrpc"),
  )
} catch {
  // non-pnpm layout — leave null and let resolution behave as before
}

// https://vite.dev/config/
export default defineConfig({
  base: './',  // Use relative paths for assets (required for Electron custom protocol)
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      ...(vscodeJsonrpcRoot
        ? [{ find: /^vscode-jsonrpc\/lib\/(.*)$/, replacement: path.join(vscodeJsonrpcRoot, "lib", "$1") }]
        : []),
    ],
  },
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
