const { join, dirname, basename } = require("path")
const { readFileSync, existsSync, mkdirSync, createWriteStream, readdirSync, lstatSync, rmSync } = require('fs')
const { spawn } = require('child_process')

const esbuild = require('esbuild')
const { copy } = require('esbuild-plugin-copy')

async function execProcess(cmd, logFile, args, buildDir= '.build') {
  let compileRoot = dirname(dirname(process.argv[1]))
  console.log('Running from',)
  console.log("Compiling...\n", process.cwd(), args)

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
  const closePromise = new Promise(resolve => {
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

switch (args[0]) {
  case 'ui': {
    console.log('Nothing to compile to UI')
    break
  }
  case 'transpile': {
    const filesToTranspile = collectFiles(join(process.cwd(), args[1]))
    let st = Date.now()  
    performESBuild(filesToTranspile)
    .then(() => {
      console.log("Transpile time: ", Date.now() - st)
    })
    break
  }
  case 'validate': {
    let st = Date.now()
    validateTSC(st).then(() => {
      console.log("Validate time: ", Date.now() - st)
    })
    break
  }
  default: {
    let st = Date.now()
    const filesToTranspile = collectFiles(join(process.cwd(), 'src'))
    Promise.all(
      [
        performESBuild(filesToTranspile),
        validateTSC()
      ]
    )
    .then(() => {
      console.log("Full build time: ", Date.now() - st)
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
    sourcemap: 'inline',
    allowOverwrite: true,
    format: 'cjs',
    plugins: [
      copy({
        // this is equal to process.cwd(), which means we use cwd path as base path to resolve `to` path
        // if not specified, this plugin uses ESBuild.build outdir/outfile options as base path.
        resolveFrom: 'cwd',
        assets: {
          from: [args[1] + '/**/*.json'],
          to: ['./lib'],
        },
        watch: true,
      })
    ]
  })
}

async function validateTSC(st) {
  await execProcess(
    'tsc',
    'validate',
    [
      '-pretty',
      "--emitDeclarationOnly",
      "--incremental",
      "--tsBuildInfoFile", ".validate/tsBuildInfoFile.info",
      ...args.splice(1)
    ], '.validate')
}

