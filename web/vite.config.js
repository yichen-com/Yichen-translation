import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 开发环境前端跑在 5173，请求代理到后端 3000
// 生产环境构建后产物复制到 server/public/ 由后端统一托管
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
})
