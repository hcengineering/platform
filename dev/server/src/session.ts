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

import type { Class, Doc, DocumentQuery, FindOptions, FindResult, Ref, Storage, Tx } from '@anticrm/core'
import { JsonRpcServer } from '@anticrm/server-ws'
import type { ServerStorage } from '@anticrm/dev-storage'

export class DevSession implements Storage {
  constructor (
    private readonly server: JsonRpcServer,
    private readonly storage: ServerStorage
  ) {}

  async findAll <T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<FindResult<T>> {
    return await this.storage.findAll(_class, query, options)
  }

  async tx (tx: Tx): Promise<void> {
    const derived = await this.storage.tx(tx)
    for (const tx of derived) {
      this.server.broadcast(this, { result: tx })
    }
  }
}
