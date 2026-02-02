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

const path = require('path')
const { execSync, spawnSync } = require('child_process')

const scriptsDir = __dirname
const modelVersion = execSync('node show_version.js', { encoding: 'utf8', cwd: scriptsDir }).trim()
const version = execSync('node show_tag.js', { encoding: 'utf8', cwd: scriptsDir }).trim()

process.env.MODEL_VERSION = modelVersion
process.env.VERSION = version

const [cmd, ...args] = process.argv.slice(2)
if (!cmd) {
  process.exit(1)
}
const command = [cmd, ...args].join(' ')
const result = spawnSync(command, { stdio: 'inherit', env: process.env, shell: true })
process.exit(result.status !== null ? result.status : 1)
