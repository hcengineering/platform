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

import { type Data, type Doc, type DocumentUpdate, systemAccountUuid, WorkspaceUuid } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import { deepEqual } from 'fast-equals'
import { type KeyValueClient, getClient as getKeyValueClient } from '@hcengineering/kvs-client'
import { type Token, type User } from './types'
import config from './config'

export class DeferredPromise<T = any> {
  public readonly promise: Promise<T>
  private _resolve: (x: T) => void = () => {}
  private _reject: (err: any) => void = () => {}

  constructor () {
    this.promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve
      this._reject = reject
    })
  }

  get resolve (): typeof this._resolve {
    return this._resolve
  }

  get reject (): typeof this._reject {
    return this._reject
  }
}

export function diffAttributes (doc: Data<Doc>, newDoc: Data<Doc>): DocumentUpdate<Doc> {
  const result: DocumentUpdate<any> = {}
  const allDocuments = new Map(Object.entries(doc))
  const newDocuments = new Map(Object.entries(newDoc))
  const targetKeys = ['from', 'textContent', 'replyTo', 'to', 'subject', 'content', 'copy', 'incoming', 'sendOn']

  for (const [key, value] of allDocuments) {
    if (!targetKeys.includes(key)) continue
    const newValue = toUndef(newDocuments.get(key))
    if (!deepEqual(newValue, toUndef(value)) && newValue !== undefined && newValue !== null) {
      // update is required, since values are different
      result[key] = newValue
    }
  }
  return result
}

function toUndef (value: any): any {
  return value === null ? undefined : value
}

export function isToken (user: User | Token): user is Token {
  return (user as Token).access_token !== undefined
}

export function addFooter (message: string): string {
  if (config.FooterMessage === undefined || config.FooterMessage.trim() === '') return message
  return message + config.FooterMessage.trim()
}

export function serviceToken (workspace?: WorkspaceUuid): string {
  return generateToken(systemAccountUuid, workspace, { service: 'gmail' })
}

export async function wait (sec: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve()
    }, sec * 1000)
  })
}

let keyValueClient: KeyValueClient | undefined
export function getKvsClient (token: string): KeyValueClient {
  if (keyValueClient !== undefined) return keyValueClient
  keyValueClient = getKeyValueClient('gmail', config.KvsUrl, token)
  return keyValueClient
}
