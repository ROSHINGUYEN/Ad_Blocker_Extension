import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const production = process.env.NODE_ENV === 'production';

/** Mỗi entry: [nguồn, đích, format]. Service worker dùng ESM; content script & popup dùng IIFE. */
const ENTRIES = [
  ['src/background.ts', 'dist/background.js', 'esm'],
  ['src/content_isolated.ts', 'dist/content_isolated.js', 'iife'],
  ['src/content_main.ts', 'dist/content_main.js', 'iife'],
  ['src/content_youtube.ts', 'dist/content_youtube.js', 'iife'],
  ['popup/popup.ts', 'popup/popup.js', 'iife'],
];

console.log(`Building Ad Blocker Extension (MV3)${production ? ' [production]' : ''}...`);

try {
  // Chạy song song; metafile để in kích thước (content script chạy trên MỌI trang nên phải nhỏ)
  const results = await Promise.all(
    ENTRIES.map(([src, out, format]) =>
      build({
        entryPoints: [resolve(__dirname, src)],
        outfile: resolve(__dirname, out),
        bundle: true,
        format,
        target: 'es2022',
        minify: production,
        sourcemap: production ? false : out.startsWith('dist/'),
        legalComments: 'none',
        metafile: true,
        logLevel: 'warning',
      })
    )
  );
  results.forEach((r, i) => {
    const [, out] = ENTRIES[i];
    const bytes = Object.values(r.metafile.outputs).reduce((n, o) => n + o.bytes, 0);
    console.log(`  ${out.padEnd(28)} ${(bytes / 1024).toFixed(1)} KB`);
  });
  console.log('Build completed. Load apps/extension as an unpacked extension.');
} catch (err) {
  console.error('Build failed:', err);
  process.exit(1);
}
