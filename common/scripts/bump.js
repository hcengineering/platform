const fs = require('fs')
const execSync = require('child_process').execSync
const repo = '@hcengineering'

const packages = {}
const pathes = {}
const jsons = {}

function fillPackages (config) {
  for (const package of config.projects) {
    if (!package.name.startsWith(repo)) continue

    packages[package.name] = {
      version: package.version,
      path: package.path
    }
    pathes[package.path] = package.name

   const file = package.path + '/package.json'
   const raw = fs.readFileSync(file)
   jsons[package.name] = JSON.parse(raw)
  }
}

function bumpPackage (name, newVersion) {
  const json = jsons[name]

  json.version = newVersion
  if (typeof json.dependencies === 'object') {
    for (const [dependency] of Object.entries(json.dependencies)) {
      if (packages[dependency] !== undefined) {
        json.dependencies[dependency] = `^${newVersion}`
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
    execSync(`cd ${package.path} && npm publish && cd ../..`, { encoding: 'utf-8' })
  } catch (err) {
    console.log(err)
  }
}

function main () {
  const args = process.argv

  const version = args[2]
  if (version === undefined || version === '') {
    console.log('usage: node bump.js <version>')
    return
  }

  console.log('bump version ...', version)

  const config = JSON.parse(execSync('rush list -p --json', { encoding: 'utf-8' }))

  fillPackages(config)

  const packageNames = Object.keys(packages)
  for (const packageName of packageNames) {
    bumpPackage(packageName, version)
  }

  for (const packageName of packageNames) {
    const package = packages[packageName]
    const file = package.path + '/package.json'
    const res = JSON.stringify(jsons[packageName], undefined, 2)
    fs.writeFileSync(file, res + '\n')
  }

  for (const packageName of packageNames) {
    if (shouldPublish(packageName)) {
      publish(packageName)
    }
  }

  console.log('... done')
}

main ()
