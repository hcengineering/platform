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
  // We need to override default factory with 'ws' one.
  // eslint-disable-next-line
  type WebSocketData = Parameters<typeof ws.on>[1]

  const ws = new WebSocket(url)

  const client: ClientSocket = {
    get readyState (): number {
      return ws.readyState
    },

    send: (data: string | ArrayBufferLike | Blob | ArrayBufferView): void => {
      if (data instanceof Blob) {
        void data.arrayBuffer().then((buffer) => {
          ws.send(buffer)
        })
      } else {
        ws.send(data)
      }
    },

    close: (code?: number): void => {
      ws.close(code)
    }
  }

  ws.on('message', (data: WebSocketData) => {
    if (client.onmessage != null) {
      const event = {
        data,
        type: 'message',
        target: this
      } as unknown as MessageEvent

      client.onmessage(event)
    }
  })

  ws.on('close', (code: number, reason: string) => {
    if (client.onclose != null) {
      const closeEvent = {
        code,
        reason,
        wasClean: code === 1000,
        type: 'close',
        target: this
      } as unknown as CloseEvent

      client.onclose(closeEvent)
    }
  })

  ws.on('open', () => {
    if (client.onopen != null) {
      const event = {
        type: 'open',
        target: this
      } as unknown as Event

      client.onopen(event)
    }
  })

  ws.on('error', (error: Error) => {
    if (client.onerror != null) {
      const event = {
        type: 'error',
        target: this,
        error
      } as unknown as Event

      client.onerror(event)
    }
  })

  return client
}
