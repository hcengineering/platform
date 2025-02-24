const esbuild = require('esbuild')
const fs = require('fs');

fs.mkdirSync('bundle', { recursive: true });

void esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    minify: true,
    keepNames: true,
    loader: { ".node": "file" },
    platform: 'node',
    outfile: 'bundle/bundle.js',
    external: ['canvas', 'sharp', 'pdfjs-dist']
})