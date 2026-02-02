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
const { spawnSync } = require('child_process')

const repoRoot = path.resolve(__dirname, '..', '..')
const args = ['docker:build', '-p', '20', '--to', '@hcengineering/pod-server', '--to', '@hcengineering/tool']
const result = spawnSync('rush', args, { stdio: 'inherit', cwd: repoRoot })
// Mimic "|| true" - always exit 0 so rush docker-server can continue to docker:up:server
process.exit(0)
