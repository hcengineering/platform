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
const { execSync, spawnSync } = require('child_process')

const cwd = process.cwd()
const registry = 'hardcoreeng'
const tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8', cwd }).trim()
const servicesDir = path.join(cwd, 'services.d')

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
  spawnSync('docker', ['buildx', 'imagetools', 'create', '--tag', target, source], { stdio: 'inherit', cwd })
  console.log('Copy:', source, '->', target)
}
