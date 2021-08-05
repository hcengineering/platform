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

/**
 * @internal
 */
export type _OperatorFunc = (doc: Doc, op: object) => void

function $push (document: Doc, keyval: Record<string, PropertyType>): void {
  const doc = document as any
  for (const key in keyval) {
    const arr = doc[key]
    if (arr === undefined) {
      doc[key] = [keyval[key]]
    } else {
      arr.push(keyval[key])
    }
  }
}

function $pushMixin (document: Doc, options: any): void {
  const doc = document as any
  const mixinId = options.$mixin
  if (mixinId === undefined) { throw new Error('$mixin must be specified for $push_mixin operation') }
  const mixin = doc[mixinId]
  const keyval = options.values
  for (const key in keyval) {
    const arr = mixin[key]
    if (arr === undefined) {
      mixin[key] = [keyval[key]]
    } else {
      arr.push(keyval[key])
    }
  }
}

const operators: Record<string, _OperatorFunc> = {
  $push,
  $pushMixin
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
