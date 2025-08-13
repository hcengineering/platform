//
// Copyright © 2025 Hardcore Engineering Inc.
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
import * as path from 'path'
import * as fs from 'fs'

interface PackedConfig {
  server?: string
  updatesChannelKey?: string
}

const configPath = path.join(process.resourcesPath, 'config/config.json')

export function readPackedConfig (): PackedConfig | undefined {
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8')) as PackedConfig
    } catch (err) {
      console.log('Failed to read packed config', err)
    }
  }
}
