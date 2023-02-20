const fs = require('fs')
const execSync = require('child_process').execSync
const repo = '@hcengineering'

const packages = {}
const pathes = {}
const shouldPublishPackages = new Set()
const packageDependencies = {}
const bumpedPackages = new Set()
const jsons = {}
const updatedPackages = new Set()

function fillPackages (config) {
  for (const package of config.projects) {
    packages[package.name] = {
      version: package.version,
      path: package.path,
      shouldPublish: package.shouldPublish
    }
    if (package.shouldPublish) {
      shouldPublishPackages.add(package.name)
    }
    pathes[package.path] = package.name
  }
}

function getChangedPackages (changedFiles) {
  let changedPackages = []
  for (const changedFile of changedFiles) {
    const filePath = changedFile.split('/')
    const changedFileRoot = `${filePath[0]}/${filePath[1]}`
    const changedPackage = pathes[changedFileRoot]
    if (changedPackage !== undefined && !changedPackages.includes(changedPackage)) {
      changedPackages.push(changedPackage)
    }
  }
  return changedPackages
}

function buildDependencyTree () {
  for (const name in packages) {
    const package = packages[name]
    const file = package.path + '/package.json'
    const raw = fs.readFileSync(file)
    const json = JSON.parse(raw)
    jsons[name] = json
    const dependencies = json.dependencies
    for (const dependency in dependencies) {
      if (dependency.startsWith(repo)) {
        const set = packageDependencies[dependency] ?? new Set()
        set.add(name)
        packageDependencies[dependency] = set
      }
    }
  }
}

function getNewVersion (json) {
  const version = json.version.split('.')
  const patch = version[2]
  const newPatch = Number(patch) + 1
  return `${version[0]}.${version[1]}.${newPatch}`
}

function isNeedBump (name) {
  if (shouldPublishPackages.has(name)) return true
  for (const dependency in packageDependencies[name] ?? []) { 
    const res = isNeedBump(dependency)
    if (res) return true
  }
  return false
}

function bumpPackage (name, dependency, depVersion) {
  let json = jsons[name]
  if (!bumpedPackages.has(name) && isNeedBump(name)) {
    const newVersion = getNewVersion(json)
    json.version = newVersion
    bumpedPackages.add(name)
    updatedPackages.add(name)
  }
  if (dependency !== undefined && depVersion !== undefined) {
    if (json.dependencies[dependency] !== `^${depVersion}`) {
      json.dependencies[dependency] = `^${depVersion}`
      updatedPackages.add(name)
    }
  }
  if (bumpedPackages.has(name)) {
    for (const dep of packageDependencies[name] ?? []) {
      bumpPackage(dep, name, json.version)
    }
  }
}

function publish (name) {
  const package = packages[name]
  execSync(`cd ${package.path}`, { encoding: 'utf-8' })
  execSync(`npm publish`, { encoding: 'utf-8' })
  execSync(`cd ../..`, { encoding: 'utf-8' })
}

function main () {
  const args = process.argv

  const config = JSON.parse(execSync('rush list -p --json', { encoding: 'utf-8' }))

  fillPackages(config)
  buildDependencyTree()

  let changedPackages = []
  if (args[2] === '-p') {
    changedPackages = args[3].split(',').map((p) => `${repo}/${p}`)
  } else {
    const tags = execSync(`git tag -l v* --sort=committerdate`, { encoding: 'utf-8' }).split('\n').filter((p) => p !== '')
    const current = tags[tags.length - 1]
    const last = tags[tags.length - 2]
    const diff = execSync(`git diff ${current} ${last} --name-only --diff-filter=ACMR | sed 's| |\\ |g\'`, { encoding: 'utf-8' })
    const changedFiles = diff.split('\n')
    changedPackages = getChangedPackages(changedFiles)
  }

  for (const packageName of changedPackages) {
    bumpPackage(packageName)
  }

  for (const packageName of updatedPackages) {
    const package = packages[packageName]
    const file = package.path + '/package.json'
    const res = JSON.stringify(jsons[packageName], undefined, 2)
    fs.writeFileSync(file, res + '\n')
  }

  for (const packageName of bumpedPackages) {
    if (shouldPublishPackages.has(packageName)) {
      publish(packageName)
    }
  }
}

main ()