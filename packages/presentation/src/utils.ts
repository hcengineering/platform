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

import { Doc, Ref, Class, DocumentQuery, FindOptions, Client, Hierarchy, Tx } from '@anticrm/core'
import { TxOperations } from '@anticrm/core'
import { LiveQuery as LQ } from '@anticrm/query'
import core from '@anticrm/core'

let liveQuery: LQ
let client: Client & TxOperations

class UIClient extends TxOperations implements Client {

  constructor (private readonly client: Client, private readonly liveQuery: LQ) {
    super(client, core.account.System)
  }

  getHierarchy (): Hierarchy { 
    return this.client.getHierarchy()
  }

  tx(tx: Tx): Promise<void> {
    return Promise.all([super.tx(tx), this.liveQuery.tx(tx)]) as unknown as Promise<void>
  }
}

export function getClient(): Client & TxOperations {
  return client
}

export function setClient(_client: Client) {
  liveQuery = new LQ(_client)
  client = new UIClient(_client, liveQuery)
  _client.notify = (tx: Tx) => {
    liveQuery.tx(tx)
  }
}

class LiveQuery {
  private unsubscribe = () => {}

  constructor() { 
    onDestroy(this.unsubscribe)
  }

  query<T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, callback: (result: T[]) => void, options?: FindOptions<T>) {
    this.unsubscribe()
    this.unsubscribe = liveQuery.query(_class, query, callback, options)
  }
}

export function createQuery() { return new LiveQuery() }
