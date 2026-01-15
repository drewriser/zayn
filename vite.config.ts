import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  // 移除了 define 中的 API_KEY 配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
