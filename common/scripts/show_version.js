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
const exec = require('child_process').exec

function main (mode) {
  exec('git describe --tags --abbrev=0', (err, stdout) => {
    if (err !== null) {
      console.log('"0.7.0"')
      return
    }

    const tag = stdout.trim()

    if (mode === 'tagTime') {
      // Take tagged git commit date as model version
      exec(`git for-each-ref --shell --format="%(creatordate:format:%s)" "refs/tags/${tag}"`, (err, stdout) => {
        console.log(`"0.7.${err === null ? stdout.trim().slice(1, -1) : 0}"`)
      })
    } else {
      // Take version from file
      let version
      try {
        const versionFilePath = path.resolve(__dirname, 'version.txt')
        version = fs.readFileSync(versionFilePath, 'utf8').trim()
      } catch (error) {
        version = '"0.6.0"'
      }

      console.log(version)
    }
  })
}

let mode = process.env.MODEL_VERSION_MODE
if (mode !== 'tagTime') {
  mode = 'file'
}

main(mode)
