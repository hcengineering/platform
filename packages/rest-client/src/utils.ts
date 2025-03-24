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

import { uncompress } from 'snappyjs'

function isDateString(value: any) {
  if (typeof value !== 'string') return false
  const dateStringRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/

  return dateStringRegex.test(value)
}

function reviver(key: string, value: any) {
  if (isDateString(value)) return new Date(value)
  return value
}

export async function extractJson<T>(response: Response): Promise<any> {
  const encoding = response.headers.get('content-encoding')
  if (encoding === 'snappy') {
    const buffer = await response.arrayBuffer()
    const decompressed = uncompress(buffer)
    const decoder = new TextDecoder()
    const jsonString = decoder.decode(decompressed)
    return JSON.parse(jsonString, reviver) as T
  }
  const jsonString = await response.text()
  return JSON.parse(jsonString, reviver) as T
}
