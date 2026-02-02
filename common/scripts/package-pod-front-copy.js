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

const cwd = process.cwd()
const distDir = path.join(cwd, 'dist')
const prodDist = path.join(cwd, '..', '..', 'dev', 'prod', 'dist')
const prodPublic = path.join(cwd, '..', '..', 'dev', 'prod', 'public')

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true })
}

fs.cpSync(prodDist, distDir, { recursive: true })

if (fs.existsSync(prodPublic)) {
  const entries = fs.readdirSync(prodPublic, { withFileTypes: true })
  for (const entry of entries) {
    const src = path.join(prodPublic, entry.name)
    const dest = path.join(distDir, entry.name)
    fs.cpSync(src, dest, { recursive: true })
  }
}

const configJson = path.join(distDir, 'config.json')
if (fs.existsSync(configJson)) {
  fs.rmSync(configJson, { force: true })
}
