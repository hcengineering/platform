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

import { getContext, setContext, onDestroy } from 'svelte'

import type { Doc, Ref, Class, DocumentQuery, FindOptions } from '@anticrm/core'
import type { Connection } from '@anticrm/client'

const CLIENT_CONEXT = 'workbench.context.Client'

export function getClient(): Connection {
  return getContext<Connection>(CLIENT_CONEXT)
}

export function setClient(client: Connection) {
  setContext(CLIENT_CONEXT, client)
}

class LiveQuery {
  private unsubscribe = () => {}
  private client = getClient()

  constructor() { 
    onDestroy(this.unsubscribe)
  }

  query<T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, callback: (result: T[]) => void, options?: FindOptions<T>) {
    this.unsubscribe()
    this.unsubscribe = this.client.query(_class, query, callback, options)
  }
}

export function createQuery() { return new LiveQuery() }
