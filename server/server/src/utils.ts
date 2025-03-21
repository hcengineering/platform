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

import { type WorkspaceUuid, type MeasureContext } from '@hcengineering/core'

import type {
  AddSessionActive,
  AddSessionResponse,
  ConnectionSocket,
  HandleRequestFunction,
  Session
} from '@hcengineering/server-core'

import { type Response } from '@hcengineering/rpc'
import type { Token } from '@hcengineering/server-token'

export interface WebsocketData {
  connectionSocket?: ConnectionSocket
  payload: Token
  token: string
  session: Promise<AddSessionResponse> | AddSessionResponse | undefined
  url: string
}

export function doSessionOp (
  data: WebsocketData,
  op: (session: AddSessionActive, msg: Buffer) => void,
  msg: Buffer
): void {
  if (data.session instanceof Promise) {
    // We need to copy since we will out of protected buffer area
    const msgCopy = Buffer.copyBytesFrom(msg)
    void data.session
      .then((_session) => {
        data.session = _session
        if ('session' in _session) {
          op(_session, msgCopy)
        }
      })
      .catch((err) => {
        console.error({ message: 'Failed to process session operation', err })
      })
  } else {
    if (data.session !== undefined && 'session' in data.session) {
      op(data.session, msg)
    }
  }
}

export function processRequest (
  session: Session,
  cs: ConnectionSocket,
  context: MeasureContext,
  workspaceId: WorkspaceUuid,
  buff: any,
  handleRequest: HandleRequestFunction
): void {
  try {
    const request = cs.readRequest(buff, session.binaryMode)
    handleRequest(context, session, cs, request, workspaceId)
  } catch (err: any) {
    if (((err.message as string) ?? '').includes('Data read, but end of buffer not reached')) {
      // ignore it
    } else {
      throw err
    }
  }
}

export function sendResponse (
  ctx: MeasureContext,
  session: Session,
  socket: ConnectionSocket,
  resp: Response<any>
): Promise<void> {
  return socket.send(ctx, resp, session.binaryMode, session.useCompression)
}
