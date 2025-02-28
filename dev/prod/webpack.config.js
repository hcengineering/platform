//
// Copyright © 2020 Anticrm Platform Contributors.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

const Dotenv = require('dotenv-webpack')
const path = require('path')
const CompressionPlugin = require('compression-webpack-plugin')
const DefinePlugin = require('webpack').DefinePlugin
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { Configuration } = require('webpack')

const mode = process.env.NODE_ENV || 'development'
const prod = mode === 'production'
const clientType = process.env.CLIENT_TYPE ?? ''
const devServer = clientType === 'dev-server'
const devServerTest = clientType === 'dev-server-test'
const devServerWorker = clientType === 'dev-worker'
const devServerWorkerLocal = clientType === 'dev-worker-local'
const devProduction = clientType === 'dev-production'
const devProductionHuly = clientType === 'dev-huly'
const devProductionBold = clientType === 'dev-bold'
const dev =
  (process.env.CLIENT_TYPE ?? '') === 'dev' || devServer || devProduction || devProductionHuly || devProductionBold || devServerWorker || devServerWorkerLocal || devServerTest
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')

const { EsbuildPlugin } = require('esbuild-loader')

const doValidate = !prod || process.env.DO_VALIDATE === 'true'

const useCache = process.env.USE_CACHE === 'true'

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const devProxy = {
  '/account': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    pathRewrite: { '^/account': '' },
    logLevel: 'debug'
  },
  '/files': {
    target: 'http://localhost:8087',
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/api/v1': {
    target: 'http://localhost:8087',
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/import': {
    target: 'http://localhost:8087',
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/rekoni/recognize': {
    target: 'http://localhost:4004',
    changeOrigin: true,
    pathRewrite: { '^/rekoni/recognize': '/recognize' },
    logLevel: 'debug'
  }
}

const devProxyTest = {
  '/account': {
    target: 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: { '^/account': '' },
    logLevel: 'debug'
  },
  '/files': {
    target: 'http://localhost:8083',
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/api/v1': {
    target: 'http://localhost:8083',
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/import': {
    target: 'http://localhost:8083',
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/rekoni/recognize': {
    target: 'http://localhost:4004',
    changeOrigin: true,
    pathRewrite: { '^/rekoni/recognize': '/recognize' },
    logLevel: 'debug'
  }
}

const devHulyProxy = {
  '/account': {
    target: 'https://account.huly.app/',
    changeOrigin: true,
    pathRewrite: { '^/account': '' },
    logLevel: 'debug'
  },
  '/api/v1': {
    target: 'http://huly.app',
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/files': {
    target: 'https://huly.app/files',
    changeOrigin: true,
    pathRewrite: { '^/files': '' },
    logLevel: 'debug'
  },
  '/rekoni/recognize': {
    target: 'https://rekoni.huly.app',
    changeOrigin: true,
    pathRewrite: { '^/rekoni/recognize': '/recognize' },
    logLevel: 'debug'
  }
}

const devBoldProxy = {
  '/account': {
    target: 'https://account.bold.ru/',
    changeOrigin: true,
    pathRewrite: { '^/account': '' },
    logLevel: 'debug'
  },
  '/files': {
    target: 'https://app.bold.ru/files',
    changeOrigin: true,
    pathRewrite: { '^/files': '' },
    logLevel: 'debug'
  },
  '/api/v1': {
    target: 'http://app.bold.ru',
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/rekoni/recognize': {
    target: 'https://rekoni.bold.ru',
    changeOrigin: true,
    pathRewrite: { '^/rekoni/recognize': '/recognize' },
    logLevel: 'debug'
  }
}

const devFrontProxy = {
  '/account': {
    target: 'https://account.hc.engineering/',
    changeOrigin: true,
    pathRewrite: { '^/account': '' },
    logLevel: 'debug'
  },
  '/files': {
    target: 'https://front.hc.engineering/files',
    changeOrigin: true,
    pathRewrite: { '^/files': '' },
    logLevel: 'debug'
  },
  '/rekoni/recognize': {
    target: 'https://rekoni.hc.enigneering',
    changeOrigin: true,
    pathRewrite: { '^/rekoni/recognize': '/recognize' },
    logLevel: 'debug'
  }
}

const proxy = {
  'dev-worker': devProxy,
  'dev-worker-local': devProxy,
  'dev-server': devProxy,
  'dev-server-test': devProxyTest,
  'dev-production': devFrontProxy,
  'dev-bold': devBoldProxy,
  'dev-huly': devHulyProxy
}

/**
 * @type {Configuration}
 */
module.exports = [
  {
    mode: dev ? 'development' : mode,
    entry: {
      serviceWorker: '@hcengineering/notification/src/serviceWorker.ts'
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /(node_modules|\.webpack)/,
          use: {
            loader: 'esbuild-loader',
            options: {
              target: 'es2022',
              keepNames: true,
              minify: prod,
              sourcemap: !prod,
              
            }
          }
        }
      ]
    },
    output: {
      path: __dirname + '/dist',
      filename: '[name].js',
      chunkFilename: '[name].js',
      publicPath: '/',
      pathinfo: false
    },
    resolve: {
      extensions: ['.ts', '.js'],
      conditionNames: ['svelte', 'browser', 'import']
    }
  },
  {
    cache: useCache
      ? {
          type: 'filesystem',
          allowCollectingMemory: true,
          cacheLocation: path.resolve(__dirname, '.build_dev')
        }
      : undefined,
    entry: {
      bundle: ['@hcengineering/theme/styles/global.scss', ...(dev ? ['./src/main-dev.ts'] : ['./src/main.ts'])]
    },
    ignoreWarnings: [
      {
        message: /a11y-/
      },
      /warning from compiler/,
      (warning) => true
    ],
    resolve: {
      symlinks: true,
      alias: {
        svelte: path.resolve('node_modules', 'svelte/src/runtime'),
        '@hcengineering/platform-rig/profiles/ui/svelte': path.resolve('node_modules', 'svelte/src/runtime')
      },
      fallback: {
        crypto: false
      },
      extensions: ['.mjs', '.js', '.svelte', '.ts'],
      mainFields: ['svelte', 'browser', 'module', 'main'],
      conditionNames: ['svelte', 'browser', 'import']
    },
    output: {
      path: __dirname + '/dist',
      filename: '[name].[contenthash].js',
      chunkFilename: '[name].[contenthash].js',
      publicPath: '/',
      pathinfo: false
    },
    optimization: prod
      ? {
          minimize: true,
          minimizer: [new EsbuildPlugin({ 
            target: 'es2022'
          })],
          splitChunks: {
            chunks: 'all'
          }
        }
      : {
          minimize: false,
          mangleExports: false,
          usedExports: false,
          splitChunks: {
            chunks: 'all'
          }
        },
    module: {
      rules: [
        {
          test: /\.ts?$/,
          loader: 'esbuild-loader',
          options: {
            target: 'es2022',
            keepNames: true,
            minify: prod,
            sourcemap: true
          },
          exclude: /node_modules/
        },
        {
          test: /\.svelte$/,
          use: [
            {
              loader: 'svelte-loader',
              options: {
                compilerOptions: {
                  dev: !prod
                },
                emitCss: true,
                hotReload: !prod,
                preprocess: require('svelte-preprocess')({
                  postcss: true,
                  sourceMap: true
                }),
                hotOptions: {
                  // Prevent preserving local component state
                  preserveLocalState: true,

                  // If this string appears anywhere in your component's code, then local
                  // state won't be preserved, even when noPreserveState is false
                  noPreserveStateKey: '@!hmr',

                  // Prevent doing a full reload on next HMR update after fatal error
                  noReload: true,

                  // Try to recover after runtime errors in component init
                  optimistic: false,

                  // --- Advanced ---

                  // Prevent adding an HMR accept handler to components with
                  // accessors option to true, or to components with named exports
                  // (from <script context="module">). This have the effect of
                  // recreating the consumer of those components, instead of the
                  // component themselves, on HMR updates. This might be needed to
                  // reflect changes to accessors / named exports in the parents,
                  // depending on how you use them.
                  acceptAccessors: true,
                  acceptNamedExports: true
                }
              }
            }
          ]
        },
        {
          test: /\.css$/,
          use: [
            // prod ? MiniCssExtractPlugin.loader :
            'style-loader',
            'css-loader',
            'postcss-loader'
          ]
        },

        {
          test: /\.scss$/,
          use: [
            // prod ? MiniCssExtractPlugin.loader :
            'style-loader',
            'css-loader',
            'postcss-loader',
            'sass-loader'
          ]
        },

        {
          test: /\.(ttf|otf|eot|woff|woff2)$/,
          use: {
            loader: 'file-loader',
            options: {
              name: 'fonts/[hash:base64:8].[ext]',
              esModule: false
            }
          }
        },
        {
          test: /\.(jpg|png|webp|heic|avif)$/,
          use: {
            loader: 'file-loader',
            options: {
              name: 'img/[contenthash].[ext]',
              esModule: false
            }
          }
        },
        {
          test: /\.(wav|ogg)$/,
          use: {
            loader: 'file-loader',
            options: {
              name: 'snd/[contenthash].[ext]',
              esModule: false
            }
          }
        },
        {
          test: /\.svg$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: 'img/[contenthash].[ext]',
                esModule: false
              }
            },
            {
              loader: 'svgo-loader',
              options: {
                plugins: [
                  { name: 'removeHiddenElems', active: false }
                  // { removeHiddenElems: { displayNone: false } },
                  // { cleanupIDs: false },
                  // { removeTitle: true }
                ]
              }
            }
          ]
        }
      ]
    },
    mode,
    plugins: [
      ...(prod
        ? [
            new BundleAnalyzerPlugin({
              analyzerMode: 'static',
              openAnalyzer: false
            })
          ]
        : []),
      new HtmlWebpackPlugin({
        meta: {
          viewport: 'width=device-width, initial-scale=1.0'
        }
      }),
      ...(prod ? [new CompressionPlugin()] : []),
      // new MiniCssExtractPlugin({
      //   filename: '[name].[id][contenthash].css'
      // }),
      new Dotenv({ path: prod ? '.env-prod' : '.env' }),
      new DefinePlugin({
        'process.env.CLIENT_TYPE': JSON.stringify(process.env.CLIENT_TYPE)
      }),
      ...(doValidate ? [new ForkTsCheckerWebpackPlugin()] : [])
    ],
    watchOptions: {
      // for some systems, watching many files can result in a lot of CPU or memory usage
      // https://webpack.js.org/configuration/watch/#watchoptionsignored
      // don't use this pattern, if you have a monorepo with linked packages
      ignored: [
        '**/node_modules',
        '**/.git',
        '**/common/temp',
        '**/.rush',
        '**/.rush/**',
        '**/rush-logs',
        '**/lib/*.js',
        '**/lib/*.js.map',
        '**/types/*.d.ts',
        '**/.git/objects/**',
        '**/node_modules/**',
        '**/desktop/deploy/**',
        '**/dist/**',
        '**/.validate/**',
        '**/.format/**',
        '**/.build_dev/**'
      ],
      aggregateTimeout: 100,
      followSymlinks: false,
      poll: 250
    },
    devtool: prod ? 'source-map' : 'eval-source-map', // 'inline-source-map',
    devServer: {
      static: {
        directory: path.resolve(__dirname, 'public'),
        publicPath: '/',
        serveIndex: true,
        watch: true
      },
      historyApiFallback: {
        disableDotRule: true
      },
      host: '0.0.0.0',
      allowedHosts: 'all',
      hot: true,
      client: {
        logging: 'info',
        overlay: {
          errors: true,
          warnings: false,
          runtimeErrors: (error) => {
            if (error.message.includes("ResizeObserver")) {
              return false;
            }
            return true;
          },
        },
        progress: false
      },
      proxy: proxy[clientType]
    }
  }
]
