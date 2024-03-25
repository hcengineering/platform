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

import client, { ClientSocket, ClientSocketReadyState } from '@hcengineering/client'
import { PlatformError, UNAUTHORIZED, broadcastEvent, getMetadata, unknownError } from '@hcengineering/platform'
import { HelloRequest, HelloResponse, readResponse, ReqId, serialize } from '@hcengineering/rpc'
import core, {
  ClientConnectEvent,
  Tx,
  TxHandler,
  TxWorkspaceEvent,
  WorkspaceEvent,
  generateId
} from '@hcengineering/core'

import { Analytics } from '@hcengineering/analytics'

import RequestPromise from './RequestPromise'

const SECOND = 1000
const dialTimeout = 60 * SECOND
const OpenConnectionMaxDelay = 15

export default class OpenConnectionComposite {
  private websocket: ClientSocket | Promise<ClientSocket> | null = null
  private readonly requests = new Map<ReqId, RequestPromise>()
  private pending: Promise<ClientSocket> | undefined
  private sockets = 0
  private incomingTimer: any
  private delay = 1
  private sessionId: string | undefined
  private url = ""
  private readonly handler: TxHandler

  private async sendRequest (data: {
    method: string
    params: any[]
    // If not defined, on reconnect with timeout, will retry automatically.
    retry?: () => Promise<boolean>
    handleResult?: (result: any) => Promise<void>
  }): Promise<any> {}

  private readonly onUpgrade?: () => void
  private readonly onUnauthorized?: () => void
  readonly onConnect?: (event: ClientConnectEvent) => Promise<void>

  public async waitOpenConnection (): Promise<ClientSocket> {
    while (true) {

      try {

        const socket = await this.pending
        if (socket != null && socket.readyState === ClientSocketReadyState.OPEN) {
          return socket
        }
        this.pending = this.openConnection()
        await this.pending
        this.delay = 5
        return await this.pending

      } catch (err: any) {

        this.pending = undefined
        console.log('failed to connect', err)

        if (err?.code === UNAUTHORIZED.code) {
          Analytics.handleError(err)
          this.onUnauthorized?.()
          throw err
        }

        await new Promise((resolve) => {
          setTimeout(() => {
            console.log(`delay ${this.delay} second`)
            resolve(null)
            if (this.delay !== OpenConnectionMaxDelay) {
              this.delay++
            }
          }, this.delay * SECOND)
        })

      }
    }
  }

  private writeSessionIdToStorage (): void {
    if (typeof sessionStorage === 'undefined') return

    sessionStorage.setItem('session.id.' + this.url, this.sessionId)
  }

  private ensureSessionId (): void {
    this.sessionId = this.sessionId ?? sessionStorage?.getItem('session.id.' + this.url) ?? generateId()

    this.writeSessionIdToStorage()
  }

  private getWSFactory (): any {
    return getMetadata(client.metadata.ClientSocketFactory) ??
      ((url: string) => {
        const s = new WebSocket(url)
        s.binaryType = 'arraybuffer'
        return s as ClientSocket
      })
  }

  private openConnection (): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      // Use defined factory or browser default one.
      const clientSocketFactory = this.getWSFactory()

      this.ensureSessionId()

      const websocket = clientSocketFactory(this.url + `?sessionId=${this.sessionId}`)
      const opened = false
      const socketId = this.sockets++
      let binaryResponse = false

      const dialTimer = setTimeout(() => {
        if (!opened) {
          websocket.close()
          reject(new PlatformError(unknownError('timeout')))
        }
      }, dialTimeout)

      websocket.onmessage = this.getHandleWSOnMessage(websocket, resolve, reject, binaryResponse)
      websocket.onclose = this.getHandleWSOnClose(reject)
      websocket.onopen = this.getHandleWSOnOpen(websocket, dialTimer)
      websocket.onerror = this.getHandleWSOnError(socketId, reject)
    })
  }

  private getHandleWSOnError (socketId, reject: CallableFunction) : (event: any) => void {
    return (event: any) => {
      console.error('client websocket error:', socketId, event)
      void broadcastEvent(client.event.NetworkRequests, -1)
      reject(new Error(`websocket error:${socketId}`))
    }
  }

  private getHandleWSOnOpen (websocket, dialTimer) : (event: any) => void {
    return () => {
      const useBinary = getMetadata(client.metadata.UseBinaryProtocol) ?? true
      const useCompression = getMetadata(client.metadata.UseProtocolCompression) ?? false
      clearTimeout(dialTimer)
      const helloRequest: HelloRequest = {
        method: 'hello',
        params: [],
        id: -1,
        binary: useBinary,
        compression: useCompression,
        broadcast: true
      }
      websocket.send(serialize(helloRequest, false))
    }
  }

  private getHandleWSOnClose ({ reject }) : (event: any) => void {
    return () => {
      // console.log('client websocket closed', socketId, ev?.reason)

      if (!(this.websocket instanceof Promise)) {
        this.websocket = null
      }
      void broadcastEvent(client.event.NetworkRequests, -1)
      reject(new Error('websocket error'))
    }
  }

  private handleWSMessagePing ({ resp, websocket, resolve, reject, binaryResponse }) : void {
    void this.sendRequest({ method: 'ping', params: [] })
  }

  private handleWSMessageHello ({ resp, websocket, resolve, reject, binaryResponse }) : void {
    if ((resp as HelloResponse).alreadyConnected === true) {
      this.ensureSessionId()

      reject(new Error('alreadyConnected'))
    }

    if ((resp as HelloResponse).binary) {
      binaryResponse = true
    }

    if (resp.error !== undefined) {
      reject(resp.error)
      return
    }

    for (const [, v] of this.requests.entries()) {
      v.reconnect?.()
    }
    resolve(websocket)

    void this.onConnect?.(
      (resp as HelloResponse).reconnect === true
        ? ClientConnectEvent.Reconnected
        : ClientConnectEvent.Connected
    )
  }

  private handleWSMessageWithNoId ({ resp, websocket }) : void {
    const txArr = Array.isArray(resp.result) ? (resp.result as Tx[]) : [resp.result as Tx]

    for (const tx of txArr) {
      if (
        (tx?._class === core.class.TxWorkspaceEvent &&
          (tx as TxWorkspaceEvent).event === WorkspaceEvent.Upgrade) ||
        tx?._class === core.class.TxModelUpgrade
      ) {
        console.log('Processing upgrade')
        websocket.send(
          serialize(
            {
              method: '#upgrading',
              params: [],
              id: -1
            },
            false
          )
        )
        this.onUpgrade?.()
        return
      }
    }
    this.handler(...txArr)

    clearTimeout(this.incomingTimer)
    void broadcastEvent(client.event.NetworkRequests, this.requests.size + 1)

    this.incomingTimer = setTimeout(() => {
      void broadcastEvent(client.event.NetworkRequests, this.requests.size)
    }, 500)
  }

  private handleWSMessageWithId ({ resp }) : void {
    const promise = this.requests.get(resp.id)
    if (promise === undefined) {
      throw new Error(`unknown response id: ${resp.id as string}`)
    }

    if (resp.chunk !== undefined) {
      promise.chunks = [
        ...(promise.chunks ?? []),
        {
          index: resp.chunk.index,
          data: resp.result as []
        }
      ]
      // console.log(socketId, 'chunk', promise.chunks.length, resp.chunk.total)
      if (resp.chunk.final) {
        promise.chunks.sort((a, b) => a.index - b.index)
        let result: any[] = []
        for (const c of promise.chunks) {
          result = result.concat(c.data)
        }
        resp.result = result
        resp.chunk = undefined
      } else {
        // Not all chunks are available yet.
        return
      }
    }

    const request = this.requests.get(resp.id)
    this.requests.delete(resp.id)

    if (resp.error !== undefined) {
      console.log(
        'ERROR',
        'request:',
        request?.method,
        'response-id:',
        resp.id,
        'error: ',
        resp.error,
        'result: ',
        resp.result
      )
      promise.reject(new PlatformError(resp.error))
    } else {
      if (request?.handleResult !== undefined) {
        void request.handleResult(resp.result).then(() => {
          promise.resolve(resp.result)
        })
      } else {
        promise.resolve(resp.result)
      }
    }

    void broadcastEvent(client.event.NetworkRequests, this.requests.size)
  }

  private getHandleWSOnMessage (websocket, resolve: CallableFunction, reject: CallableFunction, binaryResponse) : (event: any) => void {
    return (event: MessageEvent) => {
      const resp = readResponse<any>(event.data, binaryResponse)

      if (resp.id === -1 && resp.result === 'hello') {
        this.handleWSMessageHello({ resp, websocket, resolve, reject, binaryResponse })
        return
      }

      if (resp.result === 'ping') {
        this.handleWSMessagePing({ resp, websocket, resolve, reject, binaryResponse })
        return
      }

      if (resp.id !== undefined) {
        this.handleWSMessageWithId({ resp, websocket, resolve, reject, binaryResponse })
      } else {
        this.handleWSMessageWithNoId({ resp, websocket, resolve, reject, binaryResponse })
      }

    }
  }
}
