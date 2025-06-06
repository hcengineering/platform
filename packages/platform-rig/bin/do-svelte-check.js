const { join, dirname } = require('path')
const { readFileSync, existsSync, mkdirSync, createWriteStream } = require('fs')
const { spawn } = require('child_process')

function parseSvelteCheckLog(logContent) {
  const lines = logContent.split('\n')
  const errors = []
  let currentError = null

  let pline = ''
  for (const line of lines) {
    if (line.includes('Error:')) {
      // Start of a new error
      if (currentError) {
        errors.push(currentError)
      }
      currentError = {
        file: pline,
        message: line.split('Error:')[1].trim()
      }      
    } else if (line.includes('====================================')) {
      // End of log, push last error if exists
      if (currentError) {
        errors.push(currentError)
      }
      break
    }
    pline = line
  }

  // Print errors
  if (errors.length === 0) {
    console.log('No errors found')
  } else {
    errors.forEach((error) => {
      console.log(`File: ${error.file}`)
      console.log(`Message: \x1b[31m ${error.message} \x1b[0m\n`)
    })
  }
}

async function execProcess(cmd, logFile, args, useConsole) {
  let compileRoot = dirname(dirname(process.argv[1]))
  console.log('Svelte check...\n')

  if (!existsSync(join(process.cwd(), '.svelte-check'))) {
    mkdirSync(join(process.cwd(), '.svelte-check'))
  }

  const compileOut = spawn(cmd, args)

  const stdoutFilePath = `.svelte-check/${logFile}.log`
  const stderrFilePath = `.svelte-check/${logFile}-err.log`

  const outPromise = new Promise((resolve) => {
    if (compileOut.stdout != null) {
      let outPipe = createWriteStream(stdoutFilePath)
      compileOut.stdout.pipe(outPipe)
      compileOut.stdout.on('end', function (data) {
        outPipe.close()
        if (useConsole) {
          const data = readFileSync(stdoutFilePath).toString() + readFileSync(stderrFilePath).toString()
          parseSvelteCheckLog(data)
        }
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
    if( !useConsole) {
      const data = readFileSync(stdoutFilePath).toString()
      const errData = readFileSync(stderrFilePath).toString()
      parseSvelteCheckLog(data)
      console.error('\n' + errData.toString())
    }
    process.exit(editCode)
  }
}

let args = [] // process.argv.slice(2)
let useConsole = false
for (const a of process.argv.slice(2)) {
  if (a === '--console') {
    useConsole = true
  } else {
    args.push(a)
  }
}
let st = performance.now()
execProcess('svelte-check', 'svelte-check', ['--output', 'human', ...args], useConsole).then(() => {
  console.log('Svelte check time: ', Math.round((performance.now() - st) * 100) / 100)
})
