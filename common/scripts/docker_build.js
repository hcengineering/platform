//
// Copyright © 2026 Hardcore Engineering Inc.
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

const image = process.argv[2]
if (!image) {
  console.error('Usage: node docker_build.js <image-name> [.]')
  process.exit(1)
}

const version = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
const cleanup = process.env.DOCKER_BUILD_CLEANUP === 'true'
const extra = (process.env.DOCKER_EXTRA || '').trim().split(/\s+/).filter(Boolean)

console.log('Building version:', version)

const dockerArgs = ['build', '-t', image, '-t', `${image}:${version}`, ...extra, '.']
const result = spawnSync('docker', dockerArgs, { stdio: 'inherit', cwd: process.cwd() })
if (result.status !== 0) {
  process.exit(result.status)
}

if (cleanup) {
  console.log('Cleaning up build artifacts...')
  const dirs = ['bundle', 'dist', '.rush']
  for (const dir of dirs) {
    const fullPath = path.join(process.cwd(), dir)
    if (fs.existsSync(fullPath)) {
      console.log('  Removing', dir + '/')
      fs.rmSync(fullPath, { recursive: true, force: true })
    }
  }
  // Skip du -sh on Windows (no du); optional on Unix
  try {
    const size = execSync('du -sh . 2>/dev/null | cut -f1', { encoding: 'utf8' }).trim()
    if (size) console.log('  Size after cleanup:', size)
  } catch (_) {
    // ignore
  }
}
