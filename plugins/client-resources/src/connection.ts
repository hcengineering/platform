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

import { ClientSocket } from '@hcengineering/client'
import core, {
  Account,
  Class,
  ClientConnectEvent,
  ClientConnection,
  Doc,
  DocChunk,
  DocumentQuery,
  Domain,
  FindOptions,
  FindResult,
  LoadModelResponse,
  MeasureDoneOperation,
  Ref,
  SearchOptions,
  SearchQuery,
  SearchResult,
  Timestamp,
  Tx,
  TxApplyIf,
  TxApplyResult,
  TxHandler,
  TxResult,
} from '@hcengineering/core'

import { ReqId } from '@hcengineering/rpc'
import OpenConnectionComposite from './openConnection'
import SendRequestComposite from './sendRequest'
import RequestPromise from './RequestPromise'

const SECOND = 1000
const pingTimeout = 10 * SECOND
const hangTimeout = 5 * 60 * SECOND

class Connection implements ClientConnection {
  private websocket: ClientSocket | Promise<ClientSocket> | null = null
  private readonly requests = new Map<ReqId, RequestPromise>()
  private lastId = 0
  private interval: number
  private sessionId: string | undefined
  private closed = false
  private pingResponse: number = Date.now()

  private readonly waitOpenConnection: () => Promise<ClientSocket>
  private sendRequest (data: {
    method: string
    params: any[]
    // If not defined, on reconnect with timeout, will retry automatically.
    retry?: () => Promise<boolean>
    handleResult?: (result: any) => Promise<void>
  }) : Promise<any> {}

  constructor (
    private readonly url: string,
    private readonly handler: TxHandler,
    private readonly onUpgrade?: () => void,
    private readonly onUnauthorized?: () => void,
    readonly onConnect?: (event: ClientConnectEvent) => Promise<void>
  ) {
    this.waitOpenConnection = OpenConnectionComposite.prototype.waitOpenConnection.bind(this)
    this.sendRequest = SendRequestComposite.prototype.sendRequest.bind(this)

    this.setupPingInterval()
  }

  private setupPingInterval () : void {
    this.interval = setInterval(() => {
      if (this.pingResponse !== 0 && Date.now() - this.pingResponse > hangTimeout) {
        // No ping response from server.
        const ws = this.websocket

        if (!(ws instanceof Promise)) {
          console.log('no ping response from server. Closing socket.', ws, (ws as any)?.readyState)
          // Trying to close connection and re-establish it.
          ws?.close()
        } else {
          console.log('no ping response from server. Closing socket.', ws)
          void ws.then((s) => {
            s.close()
          })
        }
        this.websocket = null
      }

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      void this.sendRequest({ method: 'ping', params: [] }).then(() => {
        this.pingResponse = Date.now()
      })
    }, pingTimeout)
  }

  async close (): Promise<void> {
    if (this.closed) return
    this.closed = true

    clearInterval(this.interval)
    if (this.websocket === null) return

    if (this.websocket instanceof Promise) {
      await this.websocket.then((ws) => ws.close())
    } else {
      this.websocket.close(1000)
    }

    this.websocket = null
  }

  async measure (operationName: string): Promise<MeasureDoneOperation> {
    const dateNow = Date.now()

    // Send measure-start
    const mid = await this.sendRequest({
      method: 'measure',
      params: [operationName]
    })
    return async () => {
      const serverTime: number = await this.sendRequest({
        method: 'measure-done',
        params: [operationName, mid]
      })
      return {
        time: Date.now() - dateNow,
        serverTime
      }
    }
  }

  async loadModel (last: Timestamp, hash?: string): Promise<Tx[] | LoadModelResponse> {
    return await this.sendRequest({ method: 'loadModel', params: [last, hash] })
  }

  async getAccount (): Promise<Account> {
    return await this.sendRequest({ method: 'getAccount', params: [] })
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const st = Date.now()
    const result = await this.sendRequest({ method: 'findAll', params: [_class, query, options] })
    if (Date.now() - st > 1000) {
      console.error('measure slow findAll', Date.now() - st, _class, query, options, result)
    }
    return result
  }

  tx (tx: Tx): Promise<TxResult> {
    return this.sendRequest({
      method: 'tx',
      params: [tx],
      retry: async () => {
        if (tx._class === core.class.TxApplyIf) {
          return (await this.findAll(core.class.Tx, { _id: (tx as TxApplyIf).txes[0]._id }, { limit: 1 })).length === 0
        }
        return (await this.findAll(core.class.Tx, { _id: tx._id }, { limit: 1 })).length === 0
      },
      handleResult:
        tx._class === core.class.TxApplyIf
          ? async (result) => {
            if (tx._class === core.class.TxApplyIf) {
              // We need to check extra broadcast's and perform them before
              const r = result as TxApplyResult
              const dr = r?.derived ?? []
              if (dr.length > 0) {
                this.handler(...dr)
              }
            }
          }
          : undefined
    })
  }

  loadChunk (domain: Domain, idx?: number): Promise<DocChunk> {
    return this.sendRequest({ method: 'loadChunk', params: [domain, idx] })
  }

  closeChunk (idx: number): Promise<void> {
    return this.sendRequest({ method: 'closeChunk', params: [idx] })
  }

  loadDocs (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return this.sendRequest({ method: 'loadDocs', params: [domain, docs] })
  }

  upload (domain: Domain, docs: Doc[]): Promise<void> {
    return this.sendRequest({ method: 'upload', params: [domain, docs] })
  }

  clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    return this.sendRequest({ method: 'clean', params: [domain, docs] })
  }

  searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return this.sendRequest({ method: 'searchFulltext', params: [query, options] })
  }
}

/**
 * @public
 */
export async function connect (
  url: string,
  handler: TxHandler,
  onUpgrade?: () => void,
  onUnauthorized?: () => void,
  onConnect?: (event: ClientConnectEvent) => void
): Promise<ClientConnection> {
  return new Connection(url, handler, onUpgrade, onUnauthorized, async (event) => {
    onConnect?.(event)
  })
}
