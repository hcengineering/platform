//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { type ClientSocket, type ClientSocketFactory } from '@hcengineering/client'
import WebSocket from 'ws'

/** @public */
export const NodeWebSocketFactory: ClientSocketFactory = (url: string): ClientSocket => {
  return new NodeWebSocket(url)
}

/** @public */
export class NodeWebSocket implements ClientSocket {
  readonly ws: WebSocket

  onmessage?: ((this: ClientSocket, ev: MessageEvent) => any) | null
  onclose?: ((this: ClientSocket, ev: CloseEvent) => any) | null
  onopen?: ((this: ClientSocket, ev: Event) => any) | null
  onerror?: ((this: ClientSocket, ev: Event) => any) | null

  constructor (url: string) {
    this.ws = new WebSocket(url)

    this.ws.on('message', (data: WebSocket.Data) => {
      if (this.onmessage != null) {
        const event = {
          data,
          type: 'message',
          target: this
        } as unknown as MessageEvent

        this.onmessage(event)
      }
    })

    this.ws.on('close', (code: number, reason: string) => {
      if (this.onclose != null) {
        const closeEvent = {
          code,
          reason,
          wasClean: code === 1000,
          type: 'close',
          target: this
        } as unknown as CloseEvent

        this.onclose(closeEvent)
      }
    })

    this.ws.on('open', () => {
      if (this.onopen != null) {
        const event = {
          type: 'open',
          target: this
        } as unknown as Event

        this.onopen(event)
      }
    })

    this.ws.on('error', (error: Error) => {
      if (this.onerror != null) {
        const event = {
          type: 'error',
          target: this,
          error
        } as unknown as Event

        this.onerror(event)
      }
    })
  }

  get readyState (): number {
    return this.ws.readyState
  }

  send (data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (data instanceof Blob) {
      void data.arrayBuffer().then((buffer) => {
        this.ws.send(buffer)
      })
    } else {
      this.ws.send(data)
    }
  }

  close (code?: number): void {
    this.ws.close(code)
  }
}
