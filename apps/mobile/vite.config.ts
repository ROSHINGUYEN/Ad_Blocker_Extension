import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shiori/shared': resolve(__dirname, '../../shared/src'),
      '@shiori/rules-engine': resolve(__dirname, '../../engines/rules/src'),
      '@shiori/web-ad-engine': resolve(__dirname, '../../engines/web-ad/src'),
      '@shiori/youtube-engine': resolve(__dirname, '../../engines/youtube/src'),
      '@shiori/intelligence-engine': resolve(__dirname, '../../engines/intelligence/src'),
      '@shiori/redirect-guard': resolve(__dirname, '../../engines/redirect/src'),
    },
  },
});
