import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true
  },
  build: {
    // 生产构建输出可直接部署为静态站点
    outDir: 'dist'
  }
});