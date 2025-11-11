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

/**
 * Serializes data to JSON string, converting undefined values to null
 */
export function stringifyJSON (data: any): string {
  return JSON.stringify(data, (key, value) => {
    return value === undefined ? null : value
  })
}

/**
 * Parses JSON string back to data
 */
export function parseJSON (data: string): any {
  try {
    return JSON.parse(data)
  } catch (err: any) {
    console.error('Failed to parse JSON:', err)
    return undefined
  }
}
