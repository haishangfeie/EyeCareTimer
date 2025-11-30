import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../dist',
    // 默认会清空输出目录，可以关闭
    emptyOutDir: true,
  },
  base: './',
});
