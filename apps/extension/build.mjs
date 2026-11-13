import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function bundleExtension() {
  console.log('Building SHIORI AD CLEANER Chrome Extension (MV3)...');

  // 1. Bundle Background Service Worker
  await build({
    entryPoints: [resolve(__dirname, 'src/background.ts')],
    outfile: resolve(__dirname, 'dist/background.js'),
    bundle: true,
    format: 'esm',
    target: 'es2022',
    minify: false, // Keep readable for inspection/audit
    sourcemap: true,
  });

  // 2. Bundle Content Scripts
  await build({
    entryPoints: [resolve(__dirname, 'src/content_isolated.ts')],
    outfile: resolve(__dirname, 'dist/content_isolated.js'),
    bundle: true,
    format: 'iife',
    target: 'es2022',
    minify: false,
    sourcemap: true,
  });

  await build({
    entryPoints: [resolve(__dirname, 'src/content_main.ts')],
    outfile: resolve(__dirname, 'dist/content_main.js'),
    bundle: true,
    format: 'iife',
    target: 'es2022',
    minify: false,
    sourcemap: true,
  });

  console.log('Build completed successfully! Artifacts ready in apps/extension/dist/');
}

bundleExtension().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
