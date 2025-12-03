import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/**/*.ts'],
  platform: 'node',
  bundle: false,
  minify: false,
  outdir: 'bundle',
  keepNames: true,
  sourcemap: 'inline',
  allowOverwrite: true,
  loader: {
    '.ts': 'ts',
  },
}).catch(() => process.exit(1))
