const { join, dirname, basename } = require('path')
const {
  readFileSync,
  existsSync,
  mkdirSync,
  createWriteStream,
  readdirSync,
  lstatSync,
  rmSync,
  writeFileSync
} = require('fs')
const { spawn } = require('child_process')

const esbuild = require('esbuild')
const { copy } = require('esbuild-plugin-copy')
const fs = require('fs')
const ts = require('typescript')
const sveltePlugin = require('esbuild-svelte')
const { svelte2tsx } = require('svelte2tsx')
const sveltePreprocess = require('svelte-preprocess')

async function execProcess(cmd, logFile, args, buildDir = '.build') {
  let compileRoot = dirname(dirname(process.argv[1]))
  console.log('Running from')
  console.log('Compiling...\n', process.cwd(), args)

  if (!existsSync(join(process.cwd(), buildDir))) {
    mkdirSync(join(process.cwd(), buildDir))
  }

  const compileOut = spawn(cmd, args)

  const stdoutFilePath = `${buildDir}/${logFile}.log`
  const stderrFilePath = `${buildDir}/${logFile}-err.log`

  const outPromise = new Promise((resolve) => {
    if (compileOut.stdout != null) {
      let outPipe = createWriteStream(stdoutFilePath)
      compileOut.stdout.pipe(outPipe)
      compileOut.stdout.on('end', function (data) {
        outPipe.close()
        resolve()
      })
    } else {
      resolve()
    }
  })

  const errPromise = new Promise((resolve) => {
    if (compileOut.stderr != null) {
      let outPipe = createWriteStream(stderrFilePath)
      compileOut.stderr.pipe(outPipe)
      compileOut.stderr.on('end', function (data) {
        outPipe.close()
        resolve()
      })
    } else {
      resolve()
    }
  })

  let editCode = 0
  const closePromise = new Promise((resolve) => {
    compileOut.on('close', (code) => {
      editCode = code
      resolve()
    })
    compileOut.on('error', (err) => {
      console.error(err)
      resolve()
    })
  })

  await Promise.all([outPromise, errPromise, closePromise])

  if (editCode !== 0) {
    const data = readFileSync(stdoutFilePath)
    const errData = readFileSync(stderrFilePath)
    console.error('\n' + data.toString() + '\n' + errData.toString())
    process.exit(editCode)
  }
}

let args = process.argv.splice(2)

function collectFiles(source) {
  const result = []
  const files = readdirSync(source)
  for (const f of files) {
    const sourceFile = join(source, f)

    if (lstatSync(sourceFile).isDirectory()) {
      result.push(...collectFiles(sourceFile))
    } else {
      let ext = basename(sourceFile)
      if (!ext.endsWith('.ts') && !ext.endsWith('.js') && !ext.endsWith('.svelte')) {
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
      let ext = basename(sourceFile)
      if (!ext.endsWith('.ts') && !ext.endsWith('.js') && !ext.endsWith('.svelte')) {
        continue
      }
      result[sourceFile] = stat.mtime.getTime()
    }
  }
}

switch (args[0]) {
  case 'ui': {
    console.log('Nothing to compile to UI')
    break
  }
  case 'ui-esbuild': {
    console.log('Building UI package with Svelte support...')
    let st = performance.now()
    const filesToTranspile = collectFiles(join(process.cwd(), 'src'))
    const before = {}
    const after = {}
    collectFileStats('lib', before)
    collectFileStats('types', before)

    performESBuildWithSvelte(filesToTranspile)
      .then(() => generateSvelteTypes())
      .then(() => {
        console.log('UI build time: ', Math.round((performance.now() - st) * 100) / 100)
        collectFileStats('lib', after)
        collectFileStats('types', after)
      })
    break
  }
  case 'transpile': {
    const filesToTranspile = collectFiles(join(process.cwd(), args[1]))
    let st = performance.now()
    const before = {}
    const after = {}
    collectFileStats('lib', before)

    performESBuild(filesToTranspile).then(() => {
      console.log('Transpile time: ', Math.round((performance.now() - st) * 100) / 100)
      collectFileStats('lib', after)
    })
    break
  }
  case 'validate': {
    let st = performance.now()
    validateTSC(st).then(() => {
      console.log('Validate time: ', Math.round((performance.now() - st) * 100) / 100)
    })
    break
  }
  default: {
    let st = performance.now()
    const filesToTranspile = collectFiles(join(process.cwd(), 'src'))
    Promise.all([performESBuild(filesToTranspile), validateTSC()]).then(() => {
      console.log('Full build time: ', Math.round((performance.now() - st) * 100) / 100)
    })
    break
  }
}
async function performESBuild(filesToTranspile) {
  await esbuild.build({
    entryPoints: filesToTranspile,
    bundle: false,
    minify: false,
    outdir: 'lib',
    keepNames: true,
    sourcemap: 'linked',
    allowOverwrite: true,
    format: 'cjs',
    color: true,
    plugins: [
      copy({
        // this is equal to process.cwd(), which means we use cwd path as base path to resolve `to` path
        // if not specified, this plugin uses ESBuild.build outdir/outfile options as base path.
        resolveFrom: 'cwd',
        assets: {
          from: [args[1] + '/**/*.json'],
          to: ['./lib']
        },
        watch: false
      })
    ]
  })
}

async function performESBuildWithSvelte(filesToTranspile) {
  // Separate Svelte and non-Svelte files
  const svelteFiles = filesToTranspile.filter((f) => f.endsWith('.svelte'))
  const nonSvelteFiles = filesToTranspile.filter((f) => !f.endsWith('.svelte'))

  // Build non-Svelte files
  if (nonSvelteFiles.length > 0) {
    await esbuild.build({
      entryPoints: nonSvelteFiles,
      bundle: false,
      minify: false,
      outdir: 'lib',
      outbase: 'src',
      keepNames: true,
      logLevel: 'error',
      sourcemap: 'linked',
      allowOverwrite: true,
      format: 'cjs',
      color: true,
      plugins: [
        copy({
          resolveFrom: 'cwd',
          assets: {
            from: ['src/**/*.json'],
            to: ['./lib']
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
      outdir: 'lib',
      outbase: 'src',
      outExtension: { '.js': '.svelte.js' },
      keepNames: true,
      sourcemap: 'linked',
      logLevel: 'error',
      allowOverwrite: true,
      format: 'cjs',
      color: true,
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

async function generateSvelteTypes() {
  const srcDir = join(process.cwd(), 'src')
  const typesDir = join(process.cwd(), 'types')

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
      const result = svelte2tsx(content, {
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

async function validateTSC(st) {
  const buildDir = '.validate'
  const typesDir = join(process.cwd(), 'types')

  if (!existsSync(buildDir)) {
    mkdirSync(buildDir, { recursive: true })
  }

  const stdoutFilePath = `${buildDir}/validate.log`
  const stderrFilePath = `${buildDir}/validate-err.log`

  // Read tsconfig.json
  const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json')

  if (!configPath) {
    console.error('Could not find tsconfig.json')
    process.exit(1)
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)

  // Prepare compiler options that include the types directory
  const compilerOptionsOverride = {
    emitDeclarationOnly: true,
    incremental: true,
    tsBuildInfoFile: join(buildDir, 'tsBuildInfoFile.info')
  }

  // Add types directory to typeRoots if it exists
  if (existsSync(typesDir)) {
    compilerOptionsOverride.typeRoots = [
      ...(configFile.config.compilerOptions?.typeRoots || ['./node_modules/@types']),
      typesDir
    ]
  }

  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, process.cwd(), compilerOptionsOverride)

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
    if (diagnostic.file) {
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
    console.error('\n' + stderr.join('\n'))
    process.exit(1)
  }

  const exitCode = emitResult.emitSkipped ? 1 : 0
  if (exitCode !== 0) {
    process.exit(exitCode)
  }
}
