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

import { PlatformError, broadcastEvent, unknownError } from '@hcengineering/platform'
import client, { ClientSocket } from '@hcengineering/client'
import { ReqId, serialize } from '@hcengineering/rpc'

import RequestPromise from './RequestPromise'

export default class SendRequestComposite {
  private lastId = 0
  private closed = false
  private websocket: ClientSocket | Promise<ClientSocket> | null = null
  private readonly requests = new Map<ReqId, RequestPromise>()

  private readonly waitOpenConnection: () => Promise<ClientSocket>

  private async ensureWebSocket (): Promise<void> {
    if (this.websocket instanceof Promise) {
      this.websocket = await this.websocket
    }

    if (this.websocket === null) {
      this.websocket = this.waitOpenConnection()
      this.websocket = await this.websocket
    }
  }

  private async sendData (data, id, promise): Promise<void> {
    await this.ensureWebSocket()

    this.requests.set(id, promise)

    this.websocket.send(
      serialize(
        {
          method: data.method,
          params: data.params,
          id
        },
        false
      )
    )
  }

  public async sendRequest (data: {
    method: string
    params: any[]
    // If not defined, on reconnect with timeout, will retry automatically.
    retry?: () => Promise<boolean>
    handleResult?: (result: any) => Promise<void>
  }): Promise<any> {

    if (this.closed) {
      throw new PlatformError(unknownError('connection closed'))
    }

    const id = this.lastId++
    const promise = new RequestPromise(data.method, data.params, data.handleResult)

    promise.reconnect = () => {
      setTimeout(async () => {
        // In case we don't have response yet.
        if (this.requests.has(id) && ((await data.retry?.()) ?? true)) {
          await this.sendData(data, id, promise)
        }
      }, 500)
    }
    await this.sendData(data, id, promise)
    void broadcastEvent(client.event.NetworkRequests, this.requests.size)

    return await promise.promise
  }
}