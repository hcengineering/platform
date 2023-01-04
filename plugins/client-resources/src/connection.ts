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

import client, { ClientSocket } from '@hcengineering/client'
import core, {
  Class,
  ClientConnection,
  Doc,
  DocChunk,
  DocumentQuery,
  Domain,
  FindOptions,
  FindResult,
  Ref,
  Tx,
  TxHander,
  TxResult
} from '@hcengineering/core'
import { getMetadata, PlatformError, readResponse, ReqId, serialize, UNAUTHORIZED } from '@hcengineering/platform'

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
  private websocket: ClientSocket | Promise<ClientSocket> | null = null
  private readonly requests = new Map<ReqId, DeferredPromise>()
  private lastId = 0
  private readonly interval: number

  constructor (
    private readonly url: string,
    private readonly handler: TxHander,
    private readonly onUpgrade?: () => void,
    private readonly onUnauthorized?: () => void
  ) {
    console.log('connection created')
    this.interval = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.sendRequest('ping')
    }, 10000)
  }

  async close (): Promise<void> {
    clearInterval(this.interval)
    if (this.websocket !== null) {
      if (this.websocket instanceof Promise) {
        this.websocket = await this.websocket
      }
      this.websocket.close()
    }
  }

  delay = 1
  private async waitOpenConnection (): Promise<ClientSocket> {
    while (true) {
      try {
        const conn = await this.openConnection()
        this.delay = 5
        return conn
      } catch (err: any) {
        console.log('failed to connect', err)
        if (err.code === UNAUTHORIZED.code) {
          this.onUnauthorized?.()
          throw err
        }
        await new Promise((resolve) => {
          setTimeout(() => {
            console.log(`delay ${this.delay} second`)
            resolve(null)
            if (this.delay !== 15) {
              this.delay++
            }
          }, this.delay * 1000)
        })
      }
    }
  }

  sockets = 0

  private openConnection (): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      // Use defined factory or browser default one.
      const clientSocketFactory =
        getMetadata(client.metadata.ClientSocketFactory) ?? ((url: string) => new WebSocket(url) as ClientSocket)

      const websocket = clientSocketFactory(this.url)
      const socketId = this.sockets++
      websocket.onmessage = (event: MessageEvent) => {
        const resp = readResponse(event.data)
        if (resp.id === -1 && resp.result === 'hello') {
          if (resp.error !== undefined) {
            reject(resp.error)
            return
          }
          resolve(websocket)
          return
        }
        if (resp.id !== undefined) {
          const promise = this.requests.get(resp.id)
          if (promise === undefined) {
            throw new Error(`unknown response id: ${resp.id}`)
          }
          this.requests.delete(resp.id)
          if (resp.error !== undefined) {
            promise.reject(new PlatformError(resp.error))
          } else {
            promise.resolve(resp.result)
          }
        } else {
          const tx = resp.result as Tx
          if (tx._class === core.class.TxModelUpgrade) {
            console.log('Processing upgrade')
            websocket.send(
              serialize({
                method: '#upgrading',
                params: [],
                id: -1
              })
            )
            this.onUpgrade?.()
          }
          this.handler(tx)
        }
      }
      websocket.onclose = () => {
        console.log('client websocket closed', socketId)
        // clearInterval(interval)
        if (!(this.websocket instanceof Promise)) {
          this.websocket = null
        }
        reject(new Error('websocket error'))
      }
      websocket.onopen = () => {
        console.log('connection opened...', socketId)
        websocket.send(
          serialize({
            method: 'hello',
            params: [],
            id: -1
          })
        )
      }
      websocket.onerror = (event: any) => {
        console.log('client websocket error:', socketId, JSON.stringify(event))
        reject(new Error(`websocket error:${socketId}`))
      }
    })
  }

  private async sendRequest (method: string, ...params: any[]): Promise<any> {
    if (this.websocket instanceof Promise) {
      this.websocket = await this.websocket
    }
    if (this.websocket === null) {
      this.websocket = this.waitOpenConnection()
      this.websocket = await this.websocket
    }
    const id = this.lastId++
    this.websocket.send(
      serialize({
        method,
        params,
        id
      })
    )
    const promise = new DeferredPromise()
    this.requests.set(id, promise)
    return await promise.promise
  }

  findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return this.sendRequest('findAll', _class, query, options)
  }

  tx (tx: Tx): Promise<TxResult> {
    return this.sendRequest('tx', tx)
  }

  loadChunk (domain: Domain, idx?: number): Promise<DocChunk> {
    return this.sendRequest('loadChunk', domain, idx)
  }

  closeChunk (idx: number): Promise<void> {
    return this.sendRequest('closeChunk', idx)
  }

  loadDocs (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return this.sendRequest('loadDocs', domain, docs)
  }

  upload (domain: Domain, docs: Doc[]): Promise<void> {
    return this.sendRequest('upload', domain, docs)
  }

  clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    return this.sendRequest('clean', domain, docs)
  }
}

/**
 * @public
 */
export async function connect (
  url: string,
  handler: TxHander,
  onUpgrade?: () => void,
  onUnauthorized?: () => void
): Promise<ClientConnection> {
  return new Connection(url, handler, onUpgrade, onUnauthorized)
}
