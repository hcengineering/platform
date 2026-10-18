//
// Copyright © 2026 TraceX SAS.
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

import platform, { errorToStatus } from '@hcengineering/platform'
import { uncompress } from 'snappyjs'

export async function withRetry<T> (fn: () => Promise<T>, ignoreAttemptCheck?: (err: any) => boolean): Promise<T> {
  const maxRetries = 3
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      if (isNotRetriable(err)) {
        throw err
      }
      if (ignoreAttemptCheck !== undefined && ignoreAttemptCheck(err)) {
        // Do not decrement attempt
        attempt--
      } else {
        lastError = err
      }
      if (attempt === maxRetries - 1) {
        throw lastError
      }
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100))
    }
  }
  throw lastError
}

function isNotRetriable (err: unknown): boolean {
  const status = errorToStatus(err)
  return (
    status.code === platform.status.BadRequest ||
    status.code === platform.status.Forbidden ||
    status.code === platform.status.Unauthorized
  )
}

function rpcJSONReceiver (key: string, value: any): any {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'TotalArray') {
      return Object.assign(value.value, { total: value.total, lookupMap: value.lookupMap })
    }
  }
  return value
}

export async function extractJson<T> (response: Response): Promise<any> {
  const encoding = response.headers.get('content-encoding')
  if (encoding === 'snappy') {
    const buffer = await response.arrayBuffer()
    const decompressed = uncompress(buffer)
    const decoder = new TextDecoder()
    const jsonString = decoder.decode(decompressed)
    return JSON.parse(jsonString, rpcJSONReceiver) as T
  }
  const jsonString = await response.text()
  return JSON.parse(jsonString, rpcJSONReceiver) as T
}
