import esbuild from 'esbuild';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Recursively get all .js files in a directory
async function getJsFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getJsFiles(fullPath));
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

// First, bundle audio-dsp as a single ESM file
await esbuild.build({
  entryPoints: ['../../../packages/audio-dsp/src/index.ts'],
  platform: 'node',
  bundle: true,
  minify: false,
  outfile: 'bundle/audio-dsp.js',
  format: 'esm',
  keepNames: true,
  sourcemap: 'inline',
});

// Then compile main sources
await esbuild.build({
  entryPoints: ['src/**/*.ts'],
  platform: 'node',
  bundle: false,
  minify: false,
  outdir: 'bundle',
  outbase: 'src',
  keepNames: true,
  sourcemap: 'inline',
  allowOverwrite: true,
  loader: {
    '.ts': 'ts',
  },
}).catch(() => process.exit(1));

// Post-process: rewrite @hcengineering/audio-dsp imports
const bundleDir = resolve(__dirname, 'bundle');
const jsFiles = await getJsFiles(bundleDir);

for (const file of jsFiles) {
  if (file.endsWith('audio-dsp.js')) continue;

  let content = await readFile(file, 'utf-8');
  if (!content.includes('@hcengineering/audio-dsp')) continue;

  // Calculate relative path from this file to bundle/audio-dsp.js
  const fileDir = dirname(file);
  const relativeToBundleDir = fileDir.replace(bundleDir, '').replace(/^\//, '');
  const depth = relativeToBundleDir ? relativeToBundleDir.split('/').length : 0;
  const prefix = depth > 0 ? '../'.repeat(depth) : './';

  content = content.replace(
    /from\s+["']@hcengineering\/audio-dsp(\/[^"']*)?["']/g,
    `from "${prefix}audio-dsp.js"`
  );

  await writeFile(file, content);
}
