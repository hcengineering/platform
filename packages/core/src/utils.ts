//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import type { Account, Doc, Ref } from './classes'
import { FindResult } from './storage'

function toHex (value: number, chars: number): string {
  const result = value.toString(16)
  if (result.length < chars) {
    return '0'.repeat(chars - result.length) + result
  }
  return result
}

let counter = (Math.random() * (1 << 24)) | 0
const random = toHex((Math.random() * (1 << 24)) | 0, 6) + toHex((Math.random() * (1 << 16)) | 0, 4)

function timestamp (): string {
  const time = (Date.now() / 1000) | 0
  return toHex(time, 8)
}

function count (): string {
  const val = counter++ & 0xffffff
  return toHex(val, 6)
}

/**
 * @public
 * @returns
 */
export function generateId<T extends Doc> (): Ref<T> {
  return (timestamp() + random + count()) as Ref<T>
}

let currentAccount: Account

/**
 * @public
 * @returns
 */
export function getCurrentAccount (): Account {
  return currentAccount
}

/**
 * @public
 * @param account -
 */
export function setCurrentAccount (account: Account): void {
  currentAccount = account
}
/**
 * @public
 */
export function escapeLikeForRegexp (value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}

/**
 * @public
 */
export function toFindResult<T extends Doc> (docs: T[], total?: number): FindResult<T> {
  const length = total ?? docs.length
  return Object.assign(docs, { total: length })
}

/**
 * @public
 */
export interface WorkspaceId {
  name: string
  productId: string
}

/**
 * @public
 *
 * Combine workspace with productId, if not equal ''
 */
export function getWorkspaceId (workspace: string, productId: string = ''): WorkspaceId {
  return {
    name: workspace,
    productId
  }
}

/**
 * @public
 */
export function toWorkspaceString (id: WorkspaceId, sep = '@'): string {
  return id.name + (id.productId === '' ? '' : sep + id.productId)
}
