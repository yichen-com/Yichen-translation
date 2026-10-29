import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 开发环境前端跑在 5173，/functions/v1/app 由本地 Function 适配器（dev/function-local.mjs，:8000）提供
// 生产环境构建后产物作为站点静态文件，Function 由 Qoder Sites 托管
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/functions/v1/app': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
})
