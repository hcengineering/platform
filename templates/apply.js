const { join } = require("path")
const { readFileSync, writeFileSync, existsSync, readdirSync, lstatSync, copyFileSync, mkdirSync, rmSync } = require('fs')
const { spawnSync } = require('child_process')

/**
 * 
 * @param {Record<string, string>} current 
 * @param {Record<string, string>} template 
 * @param {string[]|undefined} skip
 * @returns 
 */
function update (current, template, skip) {
  if (template !== undefined && Object.keys(template).length > 0) {
    let value = current ?? {}
    for (const [k, v] of Object.entries(template)) {
      if(skip !== undefined) {
        console.log('check ', k, 'in', skip)
        if( skip?.includes(k)) {
          continue
        }
      }
      if(value[k] !== v) {
        console.log('updating ', k, 'to', v)
      }
      value[k] = v
    }
    return value
  }
  return current
}
function copyFiles(source, target, replaces) {
  const files = readdirSync(source)
  for (const f of files) {
    const sourceFile = join(source, f)
    const targetFile = join(target, f)
    if (lstatSync(sourceFile).isDirectory()) {
      if (!existsSync(targetFile)) {
        mkdirSync(targetFile, {recursive: true})
      }
      copyFiles(sourceFile, targetFile, replaces)
    } else {
      if( f.startsWith('~')) {
        // File should be removed from target folder
        const newTargetFile = join(target, f.substring(1))
        if (existsSync(newTargetFile)) {
          rmSync(newTargetFile)
        }
      } else {
        if( replaces.includes(targetFile) && existsSync(targetFile)) {
          // We need replace content of file as defined.
          rmSync(targetFile)
        }
        if (!existsSync(targetFile)) {
          // Copy if not exists.
          copyFileSync(sourceFile, targetFile)
        }
      }
    }
  }
}
function updatePackage(packageRoot, templates) {
  const pkgFile = join(packageRoot, 'package.json')

  const packageSource = readFileSync(pkgFile)
  const currentPackage = JSON.parse(packageSource)

  let template
  for (const t of templates) {
    if( t.isDefault && currentPackage.template === undefined) {
      template = t
    }

    // Allow to configure explicit template selection
    if( currentPackage.template === t.package.name) {
      template = t
      break
    }

    if (t.package.peerDependencies !== undefined && currentPackage.template === undefined) {
      const peers = Object.keys(t.package.peerDependencies)
      const deps = Object.keys(currentPackage.dependencies ?? {})
      const devDeps = Object.keys(currentPackage.devDependencies ?? {})
      if( peers.length > 0 && (peers.every((v) => deps.includes(v)) || peers.every((v) => devDeps.includes(v)))) {
        // If we had every peer dep in package.
        template = t
      }
    }
  }
  if( template === undefined) {
    console.warn('No template found for package', currentPackage.template)
    return
  }

  console.log('updating => ', currentPackage.name, ' with template', template.package.name)
  
  const packageJson = template.package

  currentPackage.devDependencies = update(currentPackage.devDependencies, packageJson.devDependencies )
  currentPackage.dependencies = update(currentPackage.dependencies, packageJson.dependencies )

  if( template.package['#clean'] !== undefined ) {
    for( const d of template.package['#clean'] ) {
      if(currentPackage.devDependencies) {
        delete currentPackage.devDependencies[d]
      }
      if(currentPackage.dependencies) {
        delete currentPackage.dependencies[d]
      }
    }
  }
  currentPackage.scripts = update(currentPackage.scripts, packageJson.scripts, currentPackage['#override'] )

  // Replace files section
  currentPackage.files = packageJson.files

  if( template.package['#overrideKeys'] !== undefined) {
    for( const k of template.package['#overrideKeys'] ) {
      const v = packageJson[k]
      console.log(k, v)
      if(v) {
        currentPackage[k] = v
      }
    }
  }

  const preferedOrder = ['name', 'version', 'main', 'svelte', 'types', 'files', 'author', 'template', 'license', 'scripts', 'devDependencies', 'dependencies', 'repository', 'publishConfig']

  Object.keys(currentPackage).forEach(it => {
    if( !preferedOrder.includes(it)) {
      preferedOrder.push(it)
    }
  })

  const ordered = preferedOrder.reduce(
    (obj, key) => { 
      if( currentPackage[key] !== undefined) {
        obj[key] = currentPackage[key] 
      }
      return obj
    }, 
    {}
  )

  const newPackage = JSON.stringify(ordered, undefined, 2)

  if (packageSource !== newPackage) {
    writeFileSync(pkgFile, newPackage.trim() + '\n')
  }

  // Copy missing files.

  let replaces = [...(template.package['#replaces'] ?? [])]
  // We need to remove #ignores from replaces

  if( currentPackage['#ignore']!== undefined ) {
    replaces = replaces.filter(f =>!currentPackage['#ignore'].includes(f))
  }

  copyFiles(template.root, packageRoot, replaces.map(f => join(packageRoot, f)) )

  // Clean some folders
  for( const p of template.package['#removes'] ?? []) {
    if(existsSync(join(packageRoot, p))) {
      rmSync(join(packageRoot, p), { recursive: true })
    }
  }
}

function listPackages() {
  const out = spawnSync('rush', ['list', '--json'], { encoding : 'utf8' }).stdout
  const projects = JSON.parse(out)
  return projects.projects.map(it => it.fullPath)
}

console.log('running at:', __dirname)

const templates = readdirSync(__dirname)
  .map(d => join(__dirname, d))
  .filter(d => lstatSync(d).isDirectory() && existsSync(join(d, 'package.json')) )
  .map(d => ({
    root: d, 
    isDefault: d.endsWith('default'),
    package: JSON.parse(readFileSync(join(d, 'package.json')))
  }))

console.log('Detected templates:', templates.map(t => (t.package.name + ':' + t.package.version)))

const projects = listPackages()
for (const p of projects) {
  updatePackage(p, templates)
}