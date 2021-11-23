const { join } = require("path")
const { readFileSync, writeFileSync, existsSync } = require('fs')
const { spawnSync } = require('child_process')

function update (current, template) {
  if (template !== undefined && Object.keys(template).length > 0) {
    let value = current ?? {}
    for (const [k, v] of Object.entries(template)) {
      if(value[k] !== v) {
        console.log('updating ', k, 'to', v)
      }
      value[k] = v
    }
    return value
  }
  return current
}
function updatePackage(packageRoot) {
  const pkgFile = join(packageRoot, 'package.json')

  const packageSource = readFileSync(pkgFile)
  const currentPackage = JSON.parse(packageSource)

  const pkgExtends = currentPackage.extends
  if (pkgExtends === undefined) {
    return
  }
  
  const packageJsonFile = join(packageRoot, 'node_modules', ...(pkgExtends.split('/')), 'config', 'package.json')

  console.info('Injecting extends', currentPackage.name, pkgExtends)

  if( !existsSync(packageJsonFile)) {
    console.error('failed to find:', packageJsonFile)
    return
  }

  const packageJson = JSON.parse(readFileSync(packageJsonFile))

  packageJson.devDependencies = update(currentPackage.devDependencies, packageJson.devDependencies )
  packageJson.dependencies = update(currentPackage.dependencies, packageJson.dependencies )
  packageJson.scripts = update(currentPackage.scripts, packageJson.scripts )

  const newPackage = JSON.stringify(currentPackage, undefined, 2)

  if (packageSource !== newPackage) {
    writeFileSync(pkgFile, newPackage)
  }
}

function listPackages() {
  const out = spawnSync('rush', ['list', '--json'], { encoding : 'utf8' }).stdout
  const projects = JSON.parse(out)
  return projects.projects.map(it => it.fullPath)
}

const projects = listPackages()
for (const p of projects) {
  updatePackage(p)
}