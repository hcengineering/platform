const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync
const repo = '@hcengineering'

const packages = {}
const pathes = {}
const jsons = {}
const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim()

function fillPackages (config) {
  for (const project of config.projects) {
    const packageName = project.name ?? project.packageName
    if (typeof packageName !== 'string' || !packageName.startsWith(repo)) continue
    const projectPath = project.path ?? project.projectFolder ?? path.relative(repoRoot, project.fullPath ?? '')
    if (typeof projectPath !== 'string' || projectPath.length === 0) continue
    const fullProjectPath = path.resolve(repoRoot, projectPath)

    packages[packageName] = {
      version: project.version,
      path: fullProjectPath
    }
    pathes[fullProjectPath] = packageName

    const file = path.join(fullProjectPath, 'package.json')
    if (!fs.existsSync(file)) {
      console.log('skip, package.json not found:', file)
      continue
    }

    const raw = fs.readFileSync(file)
    jsons[packageName] = JSON.parse(raw)
  }
}

function bumpPackage (name, newVersion) {
  const json = jsons[name]

  if (json === undefined) return
  json.version = newVersion
  const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
  for (const depType of depTypes) {
    if (typeof json[depType] !== 'object') continue
    for (const [dependency, currentVersion] of Object.entries(json[depType])) {
      if (packages[dependency] !== undefined) {
        json[depType][dependency] = String(currentVersion).startsWith('workspace:')
          ? `workspace:^${newVersion}`
          : `^${newVersion}`
      }
    }
  }
}

function shouldPublish (name) {
  const json = jsons[name]
  return json !== undefined && json.repository !== undefined
}

function publish (name) {
  const package = packages[name]
  try {
    console.log('publishing', name)
    execSync('npm publish', { encoding: 'utf-8', cwd: package.path })
  } catch (err) {
    console.log(err)
  }
}

function fix (name) {
  const package = packages[name]
  try {
    console.log('fixing', name)
    execSync('npm pkg fix', { encoding: 'utf-8', cwd: package.path })
  } catch (err) {
    console.log(err)
  }
}

function main () {
  const argv = process.argv.slice(2)

  const doFix = argv.includes('--fix')
  const doPublish = argv.includes('--publish')
  const doCheck = argv.includes('--check')

  const positional = argv.filter((a) => !a.startsWith('--'))
  const version = positional[0]

  if (version === undefined || version === '') {
    console.log('usage: node bump.js [--check] [--fix] [--publish] <version>')
    return
  }
  if (!/^(\d+\.)?(\d+\.)?(\*|\d+)$/.test(version)) {
    console.log('Invalid <version>', version, ' should be xx.xx.xx')
    return
  }

  console.log(doCheck ? 'check versions ...' : 'bump version ...', version)

  const output = execSync('node common/scripts/install-run-rush.js list -p --json', { encoding: 'utf-8', cwd: repoRoot })
  const lines = output.split('\n')
  let jsonStart = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('{')) {
      jsonStart = i
      break
    }
  }
  if (jsonStart === -1) {
    console.error('Could not find JSON output from rush list')
    process.exit(1)
  }
  const config = JSON.parse(lines.slice(jsonStart).join('\n'))

  fillPackages(config)

  const packageNames = Object.keys(packages)

  if (doCheck) {
    let ok = true
    for (const packageName of packageNames) {
      const json = jsons[packageName]
      if (json === undefined) continue
      if (json.version !== version) {
        console.error('Version mismatch:', packageName, 'expected', version, 'got', json.version)
        ok = false
      }
    }
    if (!ok) {
      console.error('Some @hcengineering package versions do not match', version)
      process.exit(1)
    }
    console.log('All @hcengineering package versions match', version)
    return
  }

  for (const packageName of packageNames) {
    bumpPackage(packageName, version)
  }

  for (const packageName of packageNames) {
    const pkg = packages[packageName]
    if (jsons[packageName] === undefined) continue
    const file = path.join(pkg.path, 'package.json')
    const res = JSON.stringify(jsons[packageName], undefined, 2)
    fs.writeFileSync(file, res + '\n')
  }
  if (doFix) {
    for (const packageName of packageNames) {
      if (shouldPublish(packageName)) {
        fix(packageName)
      }
    }
  }
  if (doPublish) {
    for (const packageName of packageNames) {
      if (shouldPublish(packageName)) {
        publish(packageName)
      }
    }
  }

  console.log('... done')
}

main ()
