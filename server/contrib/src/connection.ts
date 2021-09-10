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

import { Tx, Storage, Class, Doc, DocumentQuery, FindOptions, Ref, FindResult } from '@anticrm/core'
import { serialize } from '@anticrm/platform'
import WebSocket from 'ws'

/**
 * @public
 */
export class ContributingClient implements Storage {
  constructor (private readonly websocket: WebSocket) {
  }

  findAll <T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T> | undefined): Promise<FindResult<T>> {
    throw new Error('findAll not implemeneted for contributing client')
  }

  async tx (tx: Tx): Promise<void> {
    this.websocket.send(serialize({
      method: 'tx',
      params: [tx]
    }))
  }

  close (): void {
    this.websocket.close()
  }
}

/**
 * @public
 * @param url -
 * @returns
 */
export async function createContributingClient (url: string): Promise<ContributingClient> {
  return await new Promise((resolve, reject) => {
    const websocket = new WebSocket(url)
    websocket.on('open', () => {
      resolve(new ContributingClient(websocket))
    })
    websocket.on('error', (err) => {
      reject(err)
    })
  })
}
