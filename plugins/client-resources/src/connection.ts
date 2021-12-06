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

import client, { ClientSocket } from '@anticrm/client'
import type { Class, ClientConnection, Doc, DocumentQuery, FindOptions, FindResult, Ref, Tx, TxHander, TxResult } from '@anticrm/core'
import { getMetadata, readResponse, ReqId, serialize } from '@anticrm/platform'

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

class Connection implements ClientConnection {
  private websocket: ClientSocket | null = null
  private readonly requests = new Map<ReqId, DeferredPromise>()
  private lastId = 0
  private readonly interval: number

  constructor (private readonly url: string, private readonly handler: TxHander) {
    console.log('connection created')
    this.interval = setInterval(() => {
      console.log('ping')
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.sendRequest('ping')
    }, 10000)
  }

  async close (): Promise<void> {
    clearInterval(this.interval)
    this.websocket?.close()
  }

  private openConnection (): Promise<ClientSocket> {
    // Use defined factory or browser default one.
    const clientSocketFactory = getMetadata(client.metadata.ClientSocketFactory) ?? ((url: string) => new WebSocket(url) as ClientSocket)

    const websocket = clientSocketFactory(this.url)
    websocket.onmessage = (event: MessageEvent) => {
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
    websocket.onclose = () => {
      console.log('client websocket closed')
      // clearInterval(interval)
      this.websocket = null
    }
    return new Promise((resolve, reject) => {
      websocket.onopen = () => {
        resolve(websocket)
      }
      websocket.onerror = (event: any) => {
        console.log('client websocket error', event)
        reject(new Error('websocket error'))
      }
    })
  }

  private async sendRequest (method: string, ...params: any[]): Promise<any> {
    if (this.websocket === null) { this.websocket = await this.openConnection() }
    const id = this.lastId++
    this.websocket.send(serialize({
      method,
      params,
      id
    }))
    const promise = new DeferredPromise()
    this.requests.set(id, promise)
    return await promise.promise
  }

  findAll<T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<FindResult<T>> {
    return this.sendRequest('findAll', _class, query, options)
  }

  tx (tx: Tx): Promise<TxResult> {
    return this.sendRequest('tx', tx)
  }
}

/**
 * @public
 */
export async function connect (url: string, handler: TxHander): Promise<ClientConnection> {
  return new Connection(url, handler)
}
