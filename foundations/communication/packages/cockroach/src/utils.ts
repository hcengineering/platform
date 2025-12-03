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

export function injectVars (sql: string, values: any[]): string {
  return sql.replaceAll(/(\$\d+)/g, (_, idx) => {
    return escape(values[parseInt(idx.substring(1)) - 1])
  })
}

function escape (value: any): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }

  if (Array.isArray(value)) {
    return 'ARRAY[' + value.map(escape).join(',') + ']'
  }

  if (value instanceof Date) {
    return `'${value.toISOString()}'`
  }

  switch (typeof value) {
    case 'number':
      if (isNaN(value) || !isFinite(value)) {
        throw new Error('Invalid number value')
      }
      return value.toString()
    case 'boolean':
      return value ? 'TRUE' : 'FALSE'
    case 'string':
      return `'${value.replace(/'/g, "''")}'`
    case 'bigint':
      return value.toString()
    case 'object': {
      const json = JSON.stringify(value).replace(/'/g, "''")
      return `'${json}'`
    }
    default:
      throw new Error(`Unsupported value type: ${typeof value}`)
  }
}

export function convertArrayParams (params?: unknown[]): any[] | undefined {
  if (params === undefined) return undefined

  return params.map((param) => {
    if (!Array.isArray(param)) return param

    if (param.length === 0) return '{}'

    const sanitized = param.map((item) => {
      if (item === null || item === undefined) return 'NULL'

      if (typeof item === 'number' || typeof item === 'boolean') {
        return String(item)
      }

      if (typeof item === 'string') {
        const escaped = item.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        return `"${escaped}"`
      }

      const json = JSON.stringify(item)
      const escapedJson = json.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      return `"${escapedJson}"`
    })

    return `{${sanitized.join(',')}}`
  })
}

const SEP = ','
function getFirstName (name: string): string {
  return name !== undefined ? name.substring(name.indexOf(SEP) + 1) : ''
}

function getLastName (name: string): string {
  return name !== undefined ? name.substring(0, name.indexOf(SEP)) : ''
}

export function formatName (name: string): string {
  return getFirstName(name) + ' ' + getLastName(name)
}
