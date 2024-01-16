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

import { MeasureContext, toWorkspaceString } from '@hcengineering/core'
import { unknownError } from '@hcengineering/platform'
import { Response, readRequest, serialize } from '@hcengineering/rpc'
import { Token } from '@hcengineering/server-token'
import { IncomingMessage } from 'http'
import { RawData, WebSocket } from 'ws'

import { Session, SessionFactory } from './types'

export class Server {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly sessionFactory: SessionFactory
  ) {}

  async handleConnection (token: Token, ws: WebSocket, request: IncomingMessage): Promise<void> {
    const session = this.sessionFactory(token)
    const workspace = toWorkspaceString(token.workspace)

    console.log('websocket connected', session.connectionId, workspace)

    const ctx = this.ctx.newChild('client', { workspace })

    ws.on('message', (msg: RawData) => {
      void this.handleMessage(ctx, session, ws, msg)
    })

    ws.on('close', () => {
      console.log('websocket close', session.connectionId)
    })
  }

  async handleMessage (ctx: MeasureContext, session: Session, ws: WebSocket, msg: RawData): Promise<void> {
    const msgCtx = this.ctx.newChild('handleMessage', {})

    try {
      const request = readRequest(msg, false)

      try {
        const method = (session as any)[request.method]
        const params = [...request.params]

        const result = await ctx.with('call', { method: request.method }, async (callTx) =>
          method.apply(session, [callTx, ...params])
        )

        const resp: Response<any> = { id: request.id, result }
        ws.send(serialize(resp, false), { binary: false })
      } catch (err: any) {
        console.error(err)
        const resp: Response<any> = {
          id: request.id,
          error: unknownError(err),
          result: JSON.parse(JSON.stringify(err?.stack))
        }
        ws.send(serialize(resp, false), { binary: false })
      }
    } catch (err) {
      console.error(err)
      ws.close()
    } finally {
      msgCtx.end()
    }
  }
}
