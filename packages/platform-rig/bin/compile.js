const { join, dirname } = require("path")
const { readFileSync, existsSync, mkdirSync, createWriteStream } = require('fs')
const { spawn } = require('child_process')

async function execProcess(cmd, logFile, args) {
  let compileRoot = dirname(dirname(process.argv[1]))
  console.log('Running from',)
  console.log("Compiling...\n", process.cwd(), args)

  if (!existsSync(join(process.cwd(), '.build'))) {
    mkdirSync(join(process.cwd(), '.build'))
  }

  const compileOut = spawn(cmd, args)

  const stdoutFilePath = `.build/${logFile}.log`
  const stderrFilePath = `.build/${logFile}-err.log`


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

switch (args[0]) {
  case 'ui': {
    let st = Date.now()
    execProcess(
      'tsc',
      'tsc',
      [
        '-pretty',
        "--noEmit",
        "--isolatedModules",
        "--skipLibCheck",
        "--outDir",
        "./.build/dist",
        ...args.splice(1)
      ])
      .then(() => {
        console.log("Compile time: ", Date.now() - st)
      })
    break
  }
  default: {
    let st = Date.now()
    execProcess(
      'tsc',
      'tsc', [
      '-pretty',
      "--isolatedModules",
      "--skipLibCheck",
      ...process.argv.splice(2)
    ])
      .then(() => {
        console.log("Compile time: ", Date.now() - st)
      })
    break
  }
}
