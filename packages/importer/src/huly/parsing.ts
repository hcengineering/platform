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

import * as fs from 'fs'
import * as yaml from 'js-yaml'

export async function readYamlHeader (filePath: string): Promise<any> {
  const content = fs.readFileSync(filePath, 'utf8')
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (match != null) {
    return yaml.load(match[1])
  }
  return {}
}

export async function readMarkdownContent (filePath: string): Promise<string> {
  const content = fs.readFileSync(filePath, 'utf8')
  const match = content.match(/^---\n[\s\S]*?\n---\n(.*)$/s)
  return match != null ? match[1] : content
}
