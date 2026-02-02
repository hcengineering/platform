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

const path = require('path')
const { spawnSync } = require('child_process')

const repoRoot = path.resolve(__dirname, '..', '..')
const packages = [
  '@hcengineering/pod-server',
  '@hcengineering/pod-front',
  '@hcengineering/prod',
  '@hcengineering/pod-account',
  '@hcengineering/pod-workspace',
  '@hcengineering/pod-collaborator',
  '@hcengineering/tool',
  '@hcengineering/pod-print',
  '@hcengineering/pod-sign',
  '@hcengineering/pod-analytics-collector',
  '@hcengineering/rekoni-service',
  '@hcengineering/pod-ai-bot',
  '@hcengineering/import-tool',
  '@hcengineering/pod-stats',
  '@hcengineering/pod-fulltext',
  '@hcengineering/pod-love',
  '@hcengineering/pod-mail',
  '@hcengineering/pod-datalake',
  '@hcengineering/pod-mail-worker',
  '@hcengineering/pod-export',
  '@hcengineering/pod-media',
  '@hcengineering/pod-preview',
  '@hcengineering/pod-link-preview',
  '@hcengineering/pod-external',
  '@hcengineering/pod-backup',
  '@hcengineering/backup-api-pod',
  '@hcengineering/pod-billing',
  '@hcengineering/pod-process',
  '@hcengineering/pod-rating',
  '@hcengineering/pod-payment'
]

const args = ['docker:build', '-p', '20', ...packages.flatMap(p => ['--to', p])]
const result = spawnSync('rush', args, { stdio: 'inherit', cwd: repoRoot })
process.exit(result.status !== null ? result.status : 1)
