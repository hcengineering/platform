#!/usr/bin/env node

const { join, dirname, basename, relative } = require('path')
const {
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  lstatSync,
  writeFileSync,
  copyFileSync
} = require('fs')

const esbuild = require('esbuild')
const { copy } = require('esbuild-plugin-copy')
const ts = require('typescript')
const sveltePlugin = require('esbuild-svelte')
const { svelte2tsx } = require('svelte2tsx')
const sveltePreprocess = require('svelte-preprocess')

const args = process.argv.slice(2)

/**
 * Collect source files recursively from a directory
 */
function collectFiles(source) {
  const result = []
  if (!existsSync(source)) {
    return result
  }
  const files = readdirSync(source)
  for (const f of files) {
    const sourceFile = join(source, f)

    if (lstatSync(sourceFile).isDirectory()) {
      result.push(...collectFiles(sourceFile))
    } else {
      const fileName = basename(sourceFile)
      // Skip non-source files
      if (!fileName.endsWith('.ts') && !fileName.endsWith('.js') && !fileName.endsWith('.svelte')) {
        continue
      }
      result.push(sourceFile)
    }
  }
  return result
}

function collectFileStats(source, result) {
  if (!existsSync(source)) {
    return
  }
  const files = readdirSync(source)
  for (const f of files) {
    const sourceFile = join(source, f)
    const stat = lstatSync(sourceFile)
    if (stat.isDirectory()) {
      collectFileStats(sourceFile, result)
    } else {
      const ext = basename(sourceFile)
      if (!ext.endsWith('.ts') && !ext.endsWith('.js') && !ext.endsWith('.svelte')) {
        continue
      }
      result[sourceFile] = stat.mtime.getTime()
    }
  }
}

/**
 * Collect JSON files recursively from a directory
 */
function collectJsonFiles(source) {
  const result = []
  if (!existsSync(source)) {
    return result
  }
  const files = readdirSync(source)
  for (const f of files) {
    const sourceFile = join(source, f)
    if (lstatSync(sourceFile).isDirectory()) {
      result.push(...collectJsonFiles(sourceFile))
    } else if (f.endsWith('.json')) {
      result.push(sourceFile)
    }
  }
  return result
}

/**
 * Copy JSON files from source to destination preserving directory structure
 */
function copyJsonFiles(srcDir, outDir, cwd) {
  const absoluteSrcDir = join(cwd, srcDir)
  const absoluteOutDir = join(cwd, outDir)
  const jsonFiles = collectJsonFiles(absoluteSrcDir)

  for (const jsonFile of jsonFiles) {
    const relativePath = relative(absoluteSrcDir, jsonFile)
    const destFile = join(absoluteOutDir, relativePath)
    const destDir = dirname(destFile)

    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true })
    }
    copyFileSync(jsonFile, destFile)
  }
}

/**
 * Transpile TypeScript/JavaScript files using esbuild
 * @param {string[]} filesToTranspile - Array of file paths to transpile
 * @param {object} options - Options object
 * @param {string} [options.srcDir='src'] - Source directory for JSON assets
 * @param {string} [options.cwd] - Working directory (defaults to process.cwd())
 * @param {string} [options.outDir='lib'] - Output directory
 */
async function performESBuild(filesToTranspile, options = {}) {
  const {
    srcDir = 'src',
    cwd = process.cwd(),
    outDir = 'lib'
  } = options

  if (filesToTranspile.length === 0) {
    return
  }

  // Copy JSON files manually (esbuild-plugin-copy doesn't work well with absWorkingDir)
  copyJsonFiles(srcDir, outDir, cwd)

  await esbuild.build({
    entryPoints: filesToTranspile,
    bundle: false,
    minify: false,
    outdir: outDir,
    keepNames: true,
    sourcemap: 'linked',
    allowOverwrite: true,
    format: 'cjs',
    color: true,
    absWorkingDir: cwd
  })
}

async function performESBuildWithSvelte(filesToTranspile, options = {}) {
  const { cwd = process.cwd() } = options

  // Separate Svelte and non-Svelte files
  const svelteFiles = filesToTranspile.filter((f) => f.endsWith('.svelte'))
  const nonSvelteFiles = filesToTranspile.filter((f) => !f.endsWith('.svelte'))

  const outdir = join(cwd, 'lib')
  const outbase = join(cwd, 'src')

  // Build non-Svelte files
  if (nonSvelteFiles.length > 0) {
    await esbuild.build({
      entryPoints: nonSvelteFiles,
      bundle: false,
      minify: false,
      outdir,
      outbase,
      keepNames: true,
      logLevel: 'error',
      sourcemap: 'linked',
      allowOverwrite: true,
      format: 'cjs',
      color: true,
      absWorkingDir: cwd,
      plugins: [
        copy({
          resolveFrom: 'cwd',
          assets: {
            from: [join(cwd, 'src/**/*.json')],
            to: [outdir]
          },
          watch: false
        })
      ]
    })
  }

  // Build Svelte files
  if (svelteFiles.length > 0) {
    await esbuild.build({
      entryPoints: svelteFiles,
      bundle: false,
      minify: false,
      outdir,
      outbase,
      outExtension: { '.js': '.svelte.js' },
      keepNames: true,
      sourcemap: 'linked',
      logLevel: 'error',
      allowOverwrite: true,
      format: 'cjs',
      color: true,
      absWorkingDir: cwd,
      plugins: [
        sveltePlugin({
          preprocess: sveltePreprocess(),
          compilerOptions: {
            css: 'injected',
            generate: 'ssr'
          }
        })
      ]
    })
  }
}

async function generateSvelteTypes(options = {}) {
  const { cwd = process.cwd() } = options
  const srcDir = join(cwd, 'src')
  const typesDir = join(cwd, 'types')

  if (!existsSync(srcDir)) {
    return
  }

  if (!existsSync(typesDir)) {
    mkdirSync(typesDir, { recursive: true })
  }

  const svelteFiles = collectFiles(srcDir).filter((f) => f.endsWith('.svelte'))

  for (const svelteFile of svelteFiles) {
    try {
      const content = readFileSync(svelteFile, 'utf-8')
      svelte2tsx(content, {
        filename: svelteFile,
        isTsFile: true,
        mode: 'dts'
      })

      const relativePath = svelteFile.replace(srcDir, '')
      const outputPath = join(typesDir, relativePath.replace('.svelte', '.svelte.d.ts'))
      const outputDir = dirname(outputPath)

      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
      }

      // Generate simple .d.ts file for Svelte components
      const dtsContent = `import { SvelteComponentTyped } from 'svelte';\nexport default class extends SvelteComponentTyped<any, any, any> {}\n`
      writeFileSync(outputPath, dtsContent)
    } catch (err) {
      console.error(`Error generating types for ${svelteFile}:`, err.message)
    }
  }
}

/**
 * Validate TypeScript and emit declaration files
 * @param {object} options - Options object
 * @param {string} [options.cwd] - Working directory (defaults to process.cwd())
 * @param {boolean} [options.throwOnError=false] - Throw error instead of process.exit
 */
async function validateTSC(options = {}) {
  const { cwd = process.cwd(), throwOnError = false } = options
  const buildDir = join(cwd, '.validate')
  const typesDir = join(cwd, 'types')

  if (!existsSync(buildDir)) {
    mkdirSync(buildDir, { recursive: true })
  }

  const stdoutFilePath = join(buildDir, 'validate.log')
  const stderrFilePath = join(buildDir, 'validate-err.log')

  // Read tsconfig.json
  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, 'tsconfig.json')

  if (!configPath) {
    const err = new Error('Could not find tsconfig.json')
    if (throwOnError) {
      throw err
    }
    console.error(err.message)
    process.exit(1)
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)

  // Prepare compiler options
  // Note: We don't add typesDir to typeRoots because typeRoots expects directories
  // containing type packages (like @types/node), not arbitrary .d.ts files.
  // Subdirectories in typesDir (like __test__, main) would be treated as type packages,
  // causing errors like "Cannot find type definition file for '__test__'"
  const compilerOptionsOverride = {
    emitDeclarationOnly: true,
    declaration: true,
    declarationDir: typesDir,  // Always emit to types directory
    incremental: true,
    tsBuildInfoFile: join(buildDir, 'tsBuildInfoFile.info'),
    skipLibCheck: true,
    noLib: false
  }

  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, cwd, compilerOptionsOverride)

  // Add generated Svelte type files to the file list
  if (existsSync(typesDir)) {
    const svelteTypeFiles = collectFiles(typesDir).filter((f) => f.endsWith('.svelte.d.ts'))
    parsedConfig.fileNames.push(...svelteTypeFiles)
  }

  // Create the TypeScript program
  const program = ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options
  })

  // Get diagnostics
  const emitResult = program.emit()
  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  const stdout = []
  const stderr = []

  // Format diagnostics
  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start)
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      const output = `${diagnostic.file.fileName}(${line + 1},${character + 1}): error TS${diagnostic.code}: ${message}`
      stderr.push(output)
    } else {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      stderr.push(`error TS${diagnostic.code}: ${message}`)
    }
  })

  // Write logs
  writeFileSync(stdoutFilePath, stdout.join('\n'))
  writeFileSync(stderrFilePath, stderr.join('\n'))

  if (allDiagnostics.length > 0) {
    const errorMessage = stderr.join('\n')
    if (throwOnError) {
      throw new Error(errorMessage)
    }
    console.error('\n' + errorMessage)
    process.exit(1)
  }

  if (emitResult.emitSkipped) {
    const err = new Error('TypeScript emit was skipped')
    if (throwOnError) {
      throw err
    }
    process.exit(1)
  }
}

// Main execution - only run when called directly
if (require.main === module) {
  switch (args[0]) {
    case 'ui': {
      console.log('Nothing to compile for UI')
      break
    }

    case 'ui-esbuild': {
      console.log('Building UI package with Svelte support...')
      const st = performance.now()
      const filesToTranspile = collectFiles(join(process.cwd(), 'src'))
      const before = {}
      const after = {}
      collectFileStats('lib', before)
      collectFileStats('types', before)

      performESBuildWithSvelte(filesToTranspile, { cwd: process.cwd() })
        .then(() => generateSvelteTypes({ cwd: process.cwd() }))
        .then(() => {
          console.log('UI build time:', Math.round((performance.now() - st) * 100) / 100, 'ms')
          collectFileStats('lib', after)
          collectFileStats('types', after)
        })
        .catch((err) => {
          console.error('UI build failed:', err)
          process.exit(1)
        })
      break
    }

    case 'transpile': {
      const srcDir = args[1] || 'src'
      const st = performance.now()
      const filesToTranspile = collectFiles(join(process.cwd(), srcDir))
      const before = {}
      const after = {}
      collectFileStats('lib', before)

      performESBuild(filesToTranspile, { srcDir })
        .then(() => {
          console.log('Transpile time:', Math.round((performance.now() - st) * 100) / 100, 'ms')
          collectFileStats('lib', after)
        })
        .catch((err) => {
          console.error('Transpile failed:', err)
          process.exit(1)
        })
      break
    }

    case 'validate': {
      const st = performance.now()

      validateTSC()
        .then(() => {
          console.log('Validate time:', Math.round((performance.now() - st) * 100) / 100, 'ms')
        })
        .catch((err) => {
          console.error('Validate failed:', err)
          process.exit(1)
        })
      break
    }

    default: {
      // Full build: transpile + validate
      const st = performance.now()
      const filesToTranspile = collectFiles(join(process.cwd(), 'src'))

      Promise.all([performESBuild(filesToTranspile, { srcDir: 'src' }), validateTSC()])
        .then(() => {
          console.log('Full build time:', Math.round((performance.now() - st) * 100) / 100, 'ms')
        })
        .catch((err) => {
          console.error('Build failed:', err)
          process.exit(1)
        })
      break
    }
  }
}

// Export functions for use by other modules
module.exports = {
  collectFiles,
  collectFileStats,
  performESBuild,
  performESBuildWithSvelte,
  generateSvelteTypes,
  validateTSC
}
