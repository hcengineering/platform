//
// Copyright © 2023 Hardcore Engineering Inc.
//

const Dotenv = require('dotenv-webpack')
const path = require('path')
const CompressionPlugin = require('compression-webpack-plugin')
const DefinePlugin = require('webpack').DefinePlugin
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

const mode = process.env.NODE_ENV || 'development'
const prod = mode === 'production'
const dev = (process.env.CLIENT_TYPE ?? '') === 'dev' || mode === 'development'
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
console.log('mode', mode)
const { EsbuildPlugin } = require('esbuild-loader')

const doValidate = !prod || (process.env.DO_VALIDATE === 'true')

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
              target: 'es2021',
              keepNames: true,
              minify: prod,
              sourcemap: true
            }
          }
        }
      ]
    },
    output: {
      path: path.join(__dirname, 'dist'),
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
    mode: dev ? 'development' : mode,
    entry: {
      electron: './src/main/start.ts',
      preload: './src/ui/preload.ts'
    },
    target: 'electron-main',
    plugins: [
      new Dotenv({ path: prod ? '.env' : '.env-dev' }),
      new DefinePlugin({
        'process.env.MODEL_VERSION': JSON.stringify(process.env.MODEL_VERSION),
        'process.env.VERSION': JSON.stringify(process.env.VERSION)
      })
    ],
    module: {
      rules: [
        // Add support for native node modules
        {
          // We're specifying native_modules in the test because the asset relocator loader generates a
          // "fake" .node file which is really a cjs file.
          test: /native_modules[/\\].+\.node$/,
          use: 'node-loader'
        },
        {
          test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
          parser: { amd: false },
          use: {
            loader: '@vercel/webpack-asset-relocator-loader',
            options: {
              outputAssetBase: 'native_modules'
            }
          }
        },
        {
          test: /\.ts$/,
          exclude: /(node_modules|\.webpack)/,
          use: {
            loader: 'esbuild-loader',
            options: {
              target: 'es2021',
              keepNames: true,
              minify: prod,
              sourcemap: true
            }
          }
        }
      ]
    },
    output: {
      globalObject: 'this',
      path: path.join(__dirname, '/dist/main/'),
      publicPath: '',
      clean: true
    },
    resolve: {
      extensions: ['.ts', '.js'],
      conditionNames: ['svelte', 'browser', 'import'],
      alias: {
        ws: path.resolve('node_modules', 'ws/index.js')
      }
    }
  },

  // ------ UI Part --------------------------
  {
    entry: {
      bundle: ['@hcengineering/theme/styles/global.scss', ...['./src/ui/index.ts']],
      'recorder-worker': '@hcengineering/recorder-resources/src/recorder-worker.ts'
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
        crypto: false,
        path: false,
        fs: false
      },
      extensions: ['.mjs', '.js', '.svelte', '.ts'],
      conditionNames: ['svelte', 'browser', 'import']
    },
    output: {
      path: path.join(__dirname, '/dist/ui/'),
      filename: '[name].js',
      chunkFilename: '[name].js',
      publicPath: './',
      chunkFormat: false,
      clean: true
    },
    optimization: prod
      ? {
          minimize: true,
          minimizer: [
            new EsbuildPlugin({ target: 'es2021' })
          ]
        }
      : {
          minimize: false,
          mangleExports: false,
          usedExports: false
        },
    module: {
      rules: [
        {
          test: /\.ts?$/,
          loader: 'esbuild-loader',
          options: {
            target: 'es2021',
            keepNames: true,
            minify: prod,
            sourcemap: true
          },
          exclude: /node_modules/
        },
        {
          test: /\.svelte$/,
          use: {
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
        },

        {
          // required to prevent errors from Svelte on Webpack 5+, omit on Webpack 4
          test: /node_modules\/svelte\/.*\.mjs$/,
          resolve: {
            fullySpecified: false
          }
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
      new CopyPlugin({
        patterns: [{ from: 'public', to: 'public' }]
      }),
      new HtmlWebpackPlugin({
        template: './src/ui/index.ejs',
        meta: {
          viewport: 'width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=1'
        },
        publicPath: ''
      }),
      new HtmlWebpackPlugin({
        template: './src/ui/index.ejs',
        filename: 'index.windows.html',
        meta: {
          viewport: 'width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=1'
        },
        publicPath: '',
        templateParameters: {
          isWindows: true
        }
      }),
      ...(!dev ? [new CompressionPlugin()] : []),
      // new MiniCssExtractPlugin({
      //   filename: '[name].[id][contenthash].css'
      // }),
      new Dotenv({ path: prod ? '.env' : '.env-dev' }),
      new DefinePlugin({
        'process.env.CLIENT_TYPE': JSON.stringify(process.env.CLIENT_TYPE)
      }),
      ...(doValidate
        ? [
            new ForkTsCheckerWebpackPlugin()
          ]
        : [])
    ],
    watchOptions: {
      // for some systems, watching many files can result in a lot of CPU or memory usage
      // https://webpack.js.org/configuration/watch/#watchoptionsignored
      // don't use this pattern, if you have a monorepo with linked packages
      ignored: /node_modules/,
      aggregateTimeout: 100,
      poll: 250
    },
    devtool: prod ? 'source-map' : 'eval-source-map' // 'inline-source-map',
  }
]
