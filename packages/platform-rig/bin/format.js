const { join, dirname, relative, extname, basename } = require("path")
const { readFileSync, writeFileSync, existsSync, readdirSync, lstatSync, copyFileSync, mkdirSync, rmSync, current } = require('fs')
const { spawnSync, execSync } = require('child_process')
const crypto = require('crypto')

if(!existsSync('.format')) {
  mkdirSync('.format', { recursive: true })
}

let hash = {}

if( existsSync('.format/format.json') ) {
  hash = JSON.parse(readFileSync('.format/format.json').toString())
}

let filesToCheck = []
let allFiles = []

let newHash = {}

function calcHash(source, msg) {
  const files = readdirSync(source)
  for (const f of files) {
    const sourceFile = join(source, f)    
    
    if (lstatSync(sourceFile).isDirectory()) {
      calcHash(sourceFile, msg)
    } else {
      let ext = basename(sourceFile)
      if( !ext.endsWith('.ts') && !ext.endsWith('.js') && !ext.endsWith('.svelte')) {
        continue
      }
      const hasher = crypto.createHash('md5')
      hasher.update(readFileSync(sourceFile))      
      let digest = hasher.digest('hex')
      if( hash[sourceFile] !== digest ) {
        filesToCheck.push(sourceFile)
        console.log(msg, relative(process.cwd(), sourceFile))
      }
      newHash[sourceFile] = digest
      allFiles.push(sourceFile)
    }
  }
}

for( const v of process.argv.slice(2)) {
  if( existsSync(v) ) {
    console.info('checking:', join( process.cwd(), v) )
    calcHash(join(process.cwd(), v), 'changed')
  }
}

if( process.argv.includes('-f')) {
  filesToCheck = allFiles
}

if( filesToCheck.length > 0 ) {
  console.info(`running prettier ${filesToCheck.length}`)
  // Changes detected.
  const prettier = spawnSync(join(process.cwd(), 'node_modules/.bin/prettier'), ["--color", "--plugin-search-dir=.", "--write", ...filesToCheck],)
  if( prettier.stdout != null) {
    writeFileSync('.format/prettier.log', prettier.stdout)
    if( prettier.status === null || prettier.status === 0) {
      console.info(prettier.stdout.toString())
    } else {
      console.error(prettier.stdout.toString())
    }
  }
  if( prettier.stderr != null) {
    writeFileSync('.format/prettier.err', prettier.stderr)
    const data = prettier.stderr.toString()
    if( data.length > 0) {
      console.error(data)
    }
  }

  console.log(`running eslint ${filesToCheck.length}`)
  const eslint = spawnSync(join(process.cwd(), 'node_modules/.bin/eslint'), ["--color", "--fix", ...filesToCheck])
  if(eslint.stdout != null) {
    writeFileSync('.format/eslint.log', eslint.stdout)
    if( prettier.status === null || prettier.status === 0) {
      console.info(eslint.stdout.toString())
    } else {
      console.error(eslint.stdout.toString())
    }
  }
  if( eslint.stderr != null) {
    writeFileSync('.format/eslint.err', eslint.stderr)
    const data = eslint.stderr.toString()
    if( data.length > 0) {
      console.error(data)
    }
  }
  if( prettier.status || eslint.status) {
    console.info('prettier and eslint failed', prettier.status, eslint.status)
    process.exit(1)
  }

  hash = newHash
  for( const v of process.argv.slice(2)) {
    if( existsSync(v) ) {
      calcHash(join(process.cwd(), v), 'updated')
    }
  }
  writeFileSync('.format/format.json', JSON.stringify(newHash, undefined, 2))
} else {
  console.info('No changes detected.')
}

process.exit(0)

