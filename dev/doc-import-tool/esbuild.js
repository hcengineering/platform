const esbuild = require('esbuild')
const fs = require('fs');

fs.mkdirSync('bundle', { recursive: true });
esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  platform: 'node',
  outfile: 'bundle/bundle.js'
})
