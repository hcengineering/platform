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

import type { Class, Doc, DocumentQuery, FindOptions, FindResult, Ref, Storage, Tx, TxHander } from '@anticrm/core'
import type { ReqId } from '@anticrm/platform'
import { serialize, readResponse } from '@anticrm/platform'

class DeferredPromise {
  readonly promise: Promise<any>
  resolve!: (value?: any) => void
  reject!: (reason?: any) => void
  constructor () {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

class Connection implements Storage {
  private readonly requests = new Map<ReqId, DeferredPromise>()
  private lastId = 0

  constructor (private readonly webSocket: WebSocket, private readonly handler: TxHander) {
    this.webSocket.onmessage = (event: MessageEvent) => {
      const resp = readResponse(event.data)
      if (resp.id !== undefined) {
        const promise = this.requests.get(resp.id)
        if (promise === undefined) { throw new Error(`unknown response id: ${resp.id}`) }
        this.requests.delete(resp.id)
        if (resp.error !== undefined) {
          promise.reject(resp.error)
        } else {
          promise.resolve(resp.result)
        }
      } else {
        console.log('handle', resp)
        this.handler(resp.result as Tx)
      }
    }
  }

  private sendRequest (method: string, ...params: any[]): Promise<any> {
    const id = this.lastId++
    this.webSocket.send(serialize({
      method,
      params,
      id
    }))
    const promise = new DeferredPromise()
    this.requests.set(id, promise)
    return promise.promise
  }

  findAll<T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<FindResult<T>> {
    return this.sendRequest('findAll', _class, query, options)
  }

  tx (tx: Tx): Promise<void> {
    return this.sendRequest('tx', tx)
  }
}

export async function connect (url: string, handler: TxHander): Promise<Storage> {
  return await new Promise((resolve, reject) => {
    const webSocket = new WebSocket(url)
    webSocket.onopen = () => {
      resolve(new Connection(webSocket, handler))
    }
    webSocket.onerror = () => reject(new Error('Could not connect'))
  })
}
