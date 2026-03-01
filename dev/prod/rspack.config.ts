import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import path from 'path';

const mode = process.env.NODE_ENV || 'development';
const prod = mode === 'production';

const clientType = process.env.CLIENT_TYPE || '';
const dev = mode === 'development' || clientType === 'dev';

const devProxy = [
  {
    context: ['/account'],
    target: 'http://huly.local:3000',
    changeOrigin: true,
    pathRewrite: { '^/account': '' },
  },
  {
    context: ['/api/v1', '/files', '/import'],
    target: 'http://huly.local:8087',
    changeOrigin: true,
  },
  {
    context: ['/rekoni/recognize'],
    target: 'http://huly.local:4004',
    changeOrigin: true,
    pathRewrite: { '^/rekoni/recognize': '/recognize' },
  }
];

const devProxyTest = [
  {
    context: ['/account'],
    target: 'http://huly.local:3003',
    changeOrigin: true,
    pathRewrite: { '^/account': '' },
  },
  {
    context: ['/api/v1', '/files', '/import'],
    target: 'http://huly.local:8083',
    changeOrigin: true,
  },
  {
    context: ['/rekoni/recognize'],
    target: 'http://huly.local:4004',
    changeOrigin: true,
    pathRewrite: { '^/rekoni/recognize': '/recognize' },
  }
];

const proxies: Record<string, any> = {
  'dev-worker': devProxy,
  'dev-worker-local': devProxy,
  'dev-server': devProxy,
  'dev-server-test': devProxyTest,
};

export default defineConfig({
  mode: prod ? 'production' : 'development',
  context: __dirname,
  entry: {
    main: [
      '@hcengineering/theme/styles/global.scss',
      './src/eager-bundle.ts',
      dev && (clientType === 'dev-server' || clientType === 'dev') ? './src/main-dev.ts' : './src/main.ts'
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.mjs', '.js', '.svelte', '.ts'],
    mainFields: ['svelte', 'browser', 'module', 'main'],
    conditionNames: ['svelte', 'browser', 'import'],
    alias: {
      '@hcengineering/platform-rig/profiles/ui/svelte$': path.resolve(__dirname, 'node_modules/svelte/src/runtime/index.js'),
    },
    fallback: {
      crypto: false,
      fs: false,
      path: false,
      os: false,
      net: false,
      tls: false,
      child_process: false,
      http: false,
      https: false,
      stream: false,
      constants: false,
      dns: false,
    },
    symlinks: true,
  },
  module: {
    rules: [
      {
        test: /\.svelte$/,
        use: [
          {
            loader: 'svelte-loader',
            options: {
              preprocess: require('svelte-preprocess')({
                postcss: true,
                scss: {
                   silenceDeprecations: ['legacy-js-api']
                }
              }),
              onwarn: (warning: any, handler: any) => {
                if (warning.code === 'css-unused-selector' || warning.code === 'a11y-missing-attribute') return;
                handler(warning);
              }
            },
          },
        ],
      },
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: {
              syntax: 'typescript',
            },
            preserveAllComments: true,
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              api: 'modern',
              sassOptions: {
                quietDeps: true,
              },
            },
          },
        ],
        type: 'javascript/auto',
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
        type: 'javascript/auto',
      },
      {
        test: /\.(png|svg|jpg|webp|avif|ico|wav|mp3|ogg|aac|woff|woff2|ttf|otf)$/,
        type: 'asset/resource',
      },
    ],
  },
  optimization: {
    splitChunks: false,
  },
  lazyCompilation: false,
  stats: 'errors-only',
  infrastructureLogging: {
    level: 'none',
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      meta: {
        viewport: 'width=device-width, initial-scale=1.0',
      },
    }),
    new rspack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.CLIENT_TYPE': JSON.stringify(clientType),
    }),
  ],
  devServer: {
    port: 8080,
    host: '0.0.0.0',
    allowedHosts: 'all',
    historyApiFallback: {
      disableDotRule: true,
    },
    devMiddleware: {
      publicPath: '/',
    },
    client: {
      overlay: false,
      logging: 'none',
    },
    proxy: proxies[clientType] || devProxy,
    static: {
      directory: path.resolve(__dirname, 'public'),
      publicPath: '/',
    },
    hot: true,
  },
  watchOptions: {
    ignored: /node_modules/,
    poll: 1000,
  },
});
