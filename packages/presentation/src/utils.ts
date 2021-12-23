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

import { onDestroy } from 'svelte'

import core, {
  Doc,
  Ref,
  Class,
  DocumentQuery,
  FindOptions,
  Client,
  Hierarchy,
  Tx,
  getCurrentAccount,
  ModelDb,
  TxResult,
  TxOperations,
  AnyAttribute,
  RefTo,
  Collection,
  AttachedDoc,
  ArrOf
} from '@anticrm/core'
import { LiveQuery as LQ } from '@anticrm/query'
import { getMetadata } from '@anticrm/platform'
import { deepEqual } from 'fast-equals'

import login from '@anticrm/login'

let liveQuery: LQ
let client: Client & TxOperations

class UIClient extends TxOperations implements Client {
  constructor (private readonly client: Client, private readonly liveQuery: LQ) {
    super(client, getCurrentAccount()._id)
  }

  getHierarchy (): Hierarchy {
    return this.client.getHierarchy()
  }

  getModel (): ModelDb {
    return this.client.getModel()
  }

  async tx (tx: Tx): Promise<TxResult> {
    // return Promise.all([super.tx(tx), this.liveQuery.tx(tx)]) as unknown as Promise<void>
    return await super.tx(tx)
  }

  async close (): Promise<void> {
    await client.close()
  }
}

export function getClient (): Client & TxOperations {
  return client
}

export function setClient (_client: Client): void {
  liveQuery = new LQ(_client)
  client = new UIClient(_client, liveQuery)
  _client.notify = (tx: Tx) => {
    liveQuery.tx(tx).catch((err) => console.log(err))
  }
}

export class LiveQuery {
  unsubscribe = () => {}

  private lastClass: Ref<Class<Doc>> | undefined = undefined
  private lastQuery: DocumentQuery<Doc> | undefined = undefined
  private lastCallback: ((result: any[]) => void) | undefined = undefined
  private lastOptions: FindOptions<Doc> | undefined = undefined

  constructor () {
    onDestroy(() => {
      console.log('onDestroy query')
      this.unsubscribe()
    })
  }

  query<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: (result: T[]) => void,
    options?: FindOptions<T>
  ): void {
    if (!this.equal(_class, query, callback, options))
    {
      this.unsubscribe()
      this.lastClass = _class
      this.lastQuery = query
      this.lastCallback = callback
      this.lastOptions = options
      const unsub = liveQuery.query(_class, query, callback, options)
      this.unsubscribe = () => {
        unsub()
        this.unsubscribe = () => {}
      }
    }
  }

  private equal<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: (result: T[]) => void,
    options?: FindOptions<T>
  ): boolean {
    if (_class !== this.lastClass) return false
    if (!deepEqual(callback.toString(), this.lastCallback?.toString())) return false
    if (!deepEqual(query, this.lastQuery)) return false
    if (!deepEqual(options, this.lastOptions)) return false
    return true
  }
}

export function createQuery (): LiveQuery {
  console.error('created new query')
  return new LiveQuery()
}

export function getFileUrl (file: string): string {
  const uploadUrl = getMetadata(login.metadata.UploadUrl)
  const token = getMetadata(login.metadata.LoginToken)
  const url = `${uploadUrl as string}?file=${file}&token=${token as string}`
  return url
}

/**
 * @public
 */
export function getAttributePresenterClass (attribute: AnyAttribute): Ref<Class<Doc>> {
  let attrClass = attribute.type._class
  if (attrClass === core.class.RefTo) {
    attrClass = (attribute.type as RefTo<Doc>).to
  }
  if (attrClass === core.class.Collection) {
    attrClass = (attribute.type as Collection<AttachedDoc>).of
  }
  if (attrClass === core.class.ArrOf) {
    attrClass = (attribute.type as ArrOf<AttachedDoc>).of._class
  }
  return attrClass
}
