//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const cwd = process.cwd()
const registry = 'hardcoreeng'
const tag = 'latest'
const servicesDir = path.join(cwd, 'services.d')
const tempDir = path.join(cwd, '.build-cache')

fs.mkdirSync(tempDir, { recursive: true })

const gitignorePath = path.join(cwd, '.gitignore')
const gitignoreEntry = '.build-cache'
if (fs.existsSync(gitignorePath)) {
  const content = fs.readFileSync(gitignorePath, 'utf8')
  if (!content.split(/\r?\n/).some(line => line.trim() === gitignoreEntry)) {
    fs.appendFileSync(gitignorePath, '\n' + gitignoreEntry + '\n')
  }
} else {
  fs.writeFileSync(gitignorePath, gitignoreEntry + '\n')
}

function getFirstLine(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      return trimmed
    }
  }
  return ''
}

function dockerImageExists(image) {
  const r = spawnSync('docker', ['image', 'inspect', image], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return r.status === 0
}

const serviceFiles = fs.readdirSync(servicesDir, { withFileTypes: true })
  .filter(d => d.isFile() && d.name.endsWith('.service') && !d.name.startsWith('-'))
  .map(d => path.join(servicesDir, d.name))
  .sort()

for (const file of serviceFiles) {
  const line = getFirstLine(file)
  const parts = line.split(/\s+/).map(p => p.trim()).filter(Boolean)
  const targetRepo = parts[0]
  const source = parts[1]
  if (!targetRepo || !source) continue

  const target = `${registry}/${targetRepo}:${tag}`
  if (dockerImageExists(target)) {
    console.log('Exists (skipping):', target)
    continue
  }
  spawnSync('docker', ['pull', '--quiet', source], { stdio: 'inherit', cwd })
  spawnSync('docker', ['tag', source, target], { stdio: 'inherit', cwd })
  console.log('Pull&Tag:', source, '->', target)
}
