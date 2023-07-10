const fs = require('fs')
const execSync = require('child_process').execSync
const repo = '@hcengineering'

const packages = {}
const pathes = {}
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

function getVersion (json) {
  return json.version
}

function bumpPackage (name, dependency, depVersion) {
  let json = jsons[name]
  if (!bumpedPackages.has(name)) {
    const newVersion = getVersion(json)
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

function main () {
  const config = JSON.parse(execSync('rush list -p --json', { encoding: 'utf-8' }))

  fillPackages(config)
  buildDependencyTree()

  let changedPackages = Object.keys(packages)

  for (const packageName of changedPackages) {
    bumpPackage(packageName)
  }

  for (const packageName of updatedPackages) {
    const package = packages[packageName]
    const file = package.path + '/package.json'
    const res = JSON.stringify(jsons[packageName], undefined, 2)
    fs.writeFileSync(file, res + '\n')
  }
}

main ()