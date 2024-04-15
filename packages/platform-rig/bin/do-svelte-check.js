const { join, dirname } = require("path")
const { readFileSync, existsSync, mkdirSync, createWriteStream } = require('fs')
const { spawn } = require('child_process')

async function execProcess(cmd, logFile, args, useConsole) {
  let compileRoot = dirname(dirname(process.argv[1]))
  console.log("Svelte check...\n", process.cwd(), args)

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
        if( useConsole ) {
          console.log(readFileSync(stdoutFilePath).toString())
          console.log(readFileSync(stderrFilePath).toString())
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

let args = [] // process.argv.slice(2)
let useConsole = false
for(const a of process.argv.slice(2)) {
  if( a === '--console') {
    useConsole = true
  } else {
    args.push(a)
  }
}
let st = Date.now()
execProcess(
  'svelte-check',
  'svelte-check', [
  '--output', 'human',
  ...args  
], useConsole)
  .then(() => {
    console.log("Svelte check time: ", Date.now() - st)
  })

