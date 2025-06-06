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

const VARIABLE_REGEX = /\${\S+?}/
const YAML_HEADER_REGEX = /^---\n([\s\S]*?)\n---/
const MARKDOWN_CONTENT_REGEX = /^---\n[\s\S]*?\n---\n(.*)$/s

export class UnifiedFormatParser {
  constructor (private readonly variables: Record<string, any>) {}

  public readYaml (filePath: string): Record<string, any> {
    const content = fs.readFileSync(filePath, 'utf8')
    const data = yaml.load(content) as Record<string, any>
    return this.resolveProps(data)
  }

  public readYamlHeader (filePath: string): Record<string, any> {
    const content = fs.readFileSync(filePath, 'utf8')
    const match = content.match(YAML_HEADER_REGEX)
    if (match != null) {
      const header = yaml.load(match[1])
      return this.resolveProps(header as Record<string, any>)
    }
    return {}
  }

  public readMarkdownContent (filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf8')
    const match = content.match(MARKDOWN_CONTENT_REGEX)
    return match != null ? match[1] : content
  }

  public resolveProps (data: Record<string, any>): Record<string, any> {
    for (const key in data) {
      const value = (data as any)[key]
      ;(data as any)[key] = this.resolveValue(value)
    }
    return data
  }

  private resolveValue (value: any): any {
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map((v) => this.resolveValue(v))
      } else {
        return this.resolveProps(value)
      }
    } else if (typeof value === 'string') {
      while (true) {
        const matched = VARIABLE_REGEX.exec(value)
        if (matched === null) break
        const result = this.variables[matched[0]]
        if (result === undefined) {
          throw new Error(`Variable ${matched[0]} not found`)
        } else {
          value = value.replaceAll(matched[0], result)
          VARIABLE_REGEX.lastIndex = 0
        }
      }
      return value
    }
    return value
  }
}
