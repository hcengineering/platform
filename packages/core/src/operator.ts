//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import type { Doc, PropertyType } from './classes'
import type { Position, PullArray, QueryUpdate } from './tx'

/**
 * @internal
 */
export type _OperatorFunc = (doc: Doc, op: any) => void

function $push (document: Doc, keyval: Record<string, PropertyType>): void {
  const doc = document as any
  for (const key in keyval) {
    if (doc[key] === undefined) {
      doc[key] = []
    }
    const kvk = keyval[key]
    if (typeof kvk === 'object' && kvk != null) {
      const arr = doc[key] as Array<any>
      const desc = kvk as Position<PropertyType>
      if ('$each' in desc) {
        if (arr != null && Array.isArray(arr)) {
          arr.splice(desc.$position ?? 0, 0, ...desc.$each)
        }
      } else {
        arr.push(kvk)
      }
    } else {
      if (doc[key] === null || doc[key] === undefined) {
        doc[key] = [kvk]
      } else {
        doc[key].push(kvk)
      }
    }
  }
}

function $pull (document: Doc, keyval: Record<string, PropertyType>): void {
  const doc = document as any
  for (const key in keyval) {
    if (doc[key] === undefined) {
      doc[key] = []
    }
    const arr = doc[key] as Array<any>
    const kvk = keyval[key]
    if (typeof kvk === 'object' && kvk !== null) {
      const { $in } = kvk as PullArray<PropertyType>

      doc[key] = (arr ?? []).filter((val) => {
        if ($in !== undefined) {
          return !$in.includes(val)
        } else {
          // We need to match all fields
          for (const [kk, kv] of Object.entries(kvk)) {
            if (val[kk] !== kv) {
              return true
            }
          }
          return false
        }
      })
    } else {
      doc[key] = (arr ?? []).filter((val) => val !== kvk)
    }
  }
}

function matchArrayElement<T extends Doc> (docs: any[], query: Partial<T>): any[] {
  let result = [...docs]
  for (const key in query) {
    const value = (query as any)[key]

    const tresult: any[] = []
    for (const object of result) {
      const val = object[key]
      if (val === value) {
        tresult.push(object)
      }
    }
    result = tresult
    if (tresult.length === 0) {
      break
    }
  }
  return result
}

function $update (document: Doc, keyval: Record<string, PropertyType>): void {
  const doc = document as any
  for (const key in keyval) {
    if (doc[key] === undefined) {
      doc[key] = []
    }
    const val = keyval[key]
    if (typeof val === 'object') {
      const arr = doc[key] as Array<any>
      const desc = val as QueryUpdate<PropertyType>
      for (const m of matchArrayElement(arr, desc.$query)) {
        for (const [k, v] of Object.entries(desc.$update)) {
          m[k] = v
        }
      }
    }
  }
}

function $inc (document: Doc, keyval: Record<string, number>): void {
  const doc = document as unknown as Record<string, number | undefined>
  for (const key in keyval) {
    const cur = doc[key] ?? 0
    doc[key] = cur + keyval[key]
  }
}

function $unset (document: Doc, keyval: Record<string, PropertyType>): void {
  const doc = document as any
  for (const key in keyval) {
    if (doc[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete doc[key]
    }
  }
}

function $rename (document: Doc, keyval: Record<string, string>): void {
  const doc = document as any
  for (const key in keyval) {
    if (doc[key] !== undefined) {
      doc[keyval[key]] = doc[key]
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete doc[key]
    }
  }
}

const operators: Record<string, _OperatorFunc> = {
  $push,
  $pull,
  $update,
  $inc,
  $unset,
  $rename
}

/**
 * @public
 */
export function isOperator (o: Record<string, any>): boolean {
  if (o === null || typeof o !== 'object') {
    return false
  }
  const keys = Object.keys(o)
  return keys.length > 0 && keys.every((key) => key.startsWith('$'))
}

/**
 * @internal
 * @param name -
 * @returns
 */
export function _getOperator (name: string): _OperatorFunc {
  const operator = operators[name]
  if (operator === undefined) throw new Error('unknown operator: ' + name)
  return operator
}
