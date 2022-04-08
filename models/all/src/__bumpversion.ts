//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { exec } from 'child_process'
import { writeFileSync } from 'fs'
import currentVersion from './version.json'

exec('git describe --tags --abbrev=0', (err, stdout, stderr) => {
  if (err !== null) {
    console.log('Error', err)
    process.exit(1)
  }
  const rawVersion = stdout.trim().replace('v', '').split('.')
  if (rawVersion.length === 3) {
    const version = {
      major: parseInt(rawVersion[0]),
      minor: parseInt(rawVersion[1]),
      patch: parseInt(rawVersion[2])
    }
    const newVersion = JSON.stringify(version)
    if (JSON.stringify(currentVersion) !== newVersion) {
      console.log('Bumping version from', currentVersion, 'to', version)
      writeFileSync('./src/version.json', newVersion)
    } else {
      console.log('same version already')
    }
  }
})
