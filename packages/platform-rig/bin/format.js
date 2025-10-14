const { join, dirname, relative, extname, basename } = require('path')
const {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  lstatSync,
  copyFileSync,
  mkdirSync,
  rmSync,
  current
} = require('fs')
const crypto = require('crypto')
const prettier = require('prettier')
const { ESLint } = require('eslint')

let pluginSvelte
try {
  pluginSvelte = require('prettier-plugin-svelte')
} catch (e) {
  console.warn('prettier-plugin-svelte not available')
}

if (!existsSync('.format')) {
  mkdirSync('.format', { recursive: true })
}

let hash = {}

if (existsSync('.format/format.json')) {
  hash = JSON.parse(readFileSync('.format/format.json').toString())
}

let filesToCheck = []
let allFiles = []

let newHash = {}

function calcFileHash(sourceFile, msg, addCheck) {
  const hasher = crypto.createHash('md5')
  hasher.update(readFileSync(sourceFile))
  let digest = hasher.digest('hex')
  if (hash[sourceFile] !== digest) {
    if (addCheck) {
      filesToCheck.push(sourceFile)
    }
    console.log(msg, relative(process.cwd(), sourceFile))
  }
  newHash[sourceFile] = digest
  if (addCheck) {
    allFiles.push(sourceFile)
  }
}

function calcHash(source, msg, addCheck) {
  const files = readdirSync(source)
  for (const f of files) {
    const sourceFile = join(source, f)

    if (lstatSync(sourceFile).isDirectory()) {
      calcHash(sourceFile, msg, addCheck)
    } else {
      let ext = basename(sourceFile)
      if (!ext.endsWith('.ts') && !ext.endsWith('.js') && !ext.endsWith('.svelte')) {
        continue
      }
      if (sourceFile.endsWith('.d.ts')) {
        // Skip declaration files
        continue
      }
      calcFileHash(sourceFile, msg, addCheck)
    }
  }
}

for (const v of process.argv.slice(2)) {
  if (existsSync(v)) {
    console.info('checking:', join(process.cwd(), v))
    calcHash(join(process.cwd(), v), 'changed', true)
  }
}

// Add package.json,  .eslintrc.js and node_modules/@hcengineering/platform-rig/ as hash roots.
for (const f of ['package.json', '.eslintrc.js']) {
  const fFile = join(process.cwd(), f)
  if (existsSync(fFile)) {
    calcFileHash(fFile, 'changed', false)
  }
}

const rigPackage = 'node_modules/@hcengineering/platform-rig/'
if (existsSync(rigPackage)) {
  calcHash(join(process.cwd(), rigPackage), 'changed', false)
}

if (process.argv.includes('-f') || process.argv.includes('--force')) {
  console.log('force checking')
  filesToCheck = allFiles
}

if (filesToCheck.length > 0) {
  ;(async () => {
    try {
      console.info(`running prettier ${filesToCheck.length}`)

      // Run Prettier
      const prettierLog = []
      const prettierErrors = []

      for (const file of filesToCheck) {
        try {
          let options = await prettier.resolveConfig(file)
          const fileInfo = await prettier.getFileInfo(file)

          if (!fileInfo.ignored) {
            const input = readFileSync(file, 'utf8')

            // Build prettier options - remove plugins from config to avoid resolution issues
            const prettierOptions = {
              ...(options || {}),
              filepath: file,
              plugins: [] // Clear any plugins from config
            }

            // Add svelte plugin directly if available and file is .svelte
            if (pluginSvelte && file.endsWith('.svelte')) {
              prettierOptions.plugins = [pluginSvelte]
              prettierOptions.parser = 'svelte'
            }

            const formatted = await prettier.format(input, prettierOptions)

            if (input !== formatted) {
              writeFileSync(file, formatted, 'utf8')
              prettierLog.push(`Formatted: ${relative(process.cwd(), file)}`)
            }
          }
        } catch (error) {
          prettierErrors.push(`Error formatting ${file}: ${error.message}`)
        }
      }

      const prettierLogData = prettierLog.join('\n')
      const prettierErrData = prettierErrors.join('\n')

      if (prettierLogData) {
        writeFileSync('.format/prettier.log', prettierLogData)
        console.info(prettierLogData)
      }

      if (prettierErrData) {
        writeFileSync('.format/prettier.err', prettierErrData)
        console.error(prettierErrData)
      }

      console.log(`running eslint ${filesToCheck.length}`)

      // Run ESLint
      const eslint = new ESLint({ fix: true })
      const results = await eslint.lintFiles(filesToCheck)

      // Apply fixes
      await ESLint.outputFixes(results)

      const formatter = await eslint.loadFormatter('stylish')
      const resultText = formatter.format(results)

      writeFileSync('.format/eslint.log', resultText)

      // Check for errors
      const hasErrors = results.some((result) => result.errorCount > 0)
      const hasWarnings = results.some((result) => result.warningCount > 0)

      if (resultText) {
        if (hasErrors) {
          console.error(resultText)
        } else {
          console.info(resultText)
        }
      }

      const prettierFailed = prettierErrors.length > 0
      const eslintFailed = hasErrors

      if (prettierFailed || eslintFailed) {
        console.info('prettier or eslint failed')
        // Make file empty, to prevent false passing if called without -f or --force.
        writeFileSync('.format/format.json', JSON.stringify({}, undefined, 2))
        process.exit(1)
      }

      hash = newHash
      for (const v of process.argv.slice(2)) {
        if (existsSync(v)) {
          calcHash(join(process.cwd(), v), 'updated')
        }
      }
      writeFileSync('.format/format.json', JSON.stringify(newHash, undefined, 2))

      console.info('Formatting completed successfully.')
      process.exit(0)
    } catch (error) {
      console.error('Formatting failed:', error)
      writeFileSync('.format/format.json', JSON.stringify({}, undefined, 2))
      process.exit(1)
    }
  })()
} else {
  console.info('No changes detected.')
  process.exit(0)
}
